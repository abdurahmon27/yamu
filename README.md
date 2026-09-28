# yamu

Put your **Yandex Music** playlist on your portfolio or your GitHub profile —
fetched once at build time, committed as plain JSON and an SVG card, served
with the rest of your static files.

![Yandex Music card](./examples/card-gruvbox.svg)

Nothing runs on your site at runtime. Nothing of yours is stored anywhere but
your own repository. Public playlists need **no token at all**.

---

## Why it works this way

Yandex Music has no public API, and the endpoints the web player uses reject
browser requests from other origins. So the data has to be collected somewhere
else — and a scheduled GitHub Action is the smallest "somewhere else" there is:
it runs in your repo, writes a file, commits it, and your existing deploy picks
it up.

That also means your page keeps working on the day Yandex changes something.
The worst case is a file that stops refreshing, not a page that breaks.

**There is no "now playing".** Reading the current track needs a token *and*
the queue-sync the official apps do, and a cron job that runs every few minutes
cannot honestly claim to know what you are listening to right now. What you get
instead is a playlist, your liked tracks, and the list of playlists you made —
all of which are true for as long as they are on screen.

> **Read [Where this can run](#where-this-can-run) first.** Yandex Music
> answers GitHub-hosted runners with 451, so a scheduled job needs either a
> runner in a region it serves or a small proxy. Everything else below works
> exactly as written.

## Where this can run

Yandex Music is licensed per country, and from anywhere it does not serve it
answers **451 Unavailable For Legal Reasons** — every domain, `.ru`, `.uz`,
`.com` and `.by` alike. That includes **every GitHub-hosted runner**: measured
from one in Chicago, all five hosts returned 451. yamu says so in the error now
instead of shrugging at it.

So the fetch has to happen somewhere Yandex Music answers. Three ways:

| Where it runs | How |
|---|---|
| **A machine in a region it serves** | Your own laptop or a VPS there — run `yamu fetch` from cron or a systemd timer and push the result. [Worked example](./examples/local-cron.md). |
| **A self-hosted runner there** | The same workflow with `runs-on: self-hosted`. |
| **A GitHub runner plus a proxy** | Run [`yamu serve`](#the-proxy) on a machine it serves and point the action at it with `api-base`. |

One line tells you whether a given machine can do it:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  https://api.music.yandex.com/playlist/ch.448df3eb-daee-408a-a60a-252259db2f3b
```

`200` — that machine is fine. `451` — it is not.

## Quick start — a card in your profile README

No token, no account anywhere, about two minutes:

```yaml
# .github/workflows/music.yml
name: music
on:
  schedule: [{ cron: "0 */6 * * *" }]
  workflow_dispatch:
permissions:
  contents: write
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: abdurahmon27/yamu@v1
        with:
          # Paste the link the share button gives you. That is the whole setup:
          # a uuid link identifies the playlist on its own, so there is no
          # login to look up and nothing to authenticate.
          playlist: "https://music.yandex.com/playlists/lk.1234abcd-5678-…"
          card: "music.svg"
          theme: "gruvbox" # gruvbox | dark | light | nord | tokyonight
          cover: "true"
      - run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add music.json music.svg
          git diff --staged --quiet || git commit -m "chore: refresh music"
          git push
```

Then in your `README.md`:

```md
![music](./music.svg)
```

Full copies of this and a site-oriented version live in [`examples/`](./examples).

## Quick start — a portfolio site

Fetch into your repo, then render the JSON with your own components:

```bash
npx github:abdurahmon27/yamu fetch \
  --playlist "https://music.yandex.com/playlists/lk.1234abcd-5678-…" \
  --limit 20 \
  --out public/music.json
```

```tsx
import music from "../public/music.json";
import { YamuPlaylist } from "yamu/react";

export function Music() {
  return <YamuPlaylist data={music} limit={8} />;
}
```

`YamuPlaylist` ships **no styles** — it renders semantic markup with `yamu-*`
class names and leaves the design to you. Or skip it entirely and map over
`music.playlist.tracks` yourself; the JSON is the real interface.

## Finding your user and playlist

Everything yamu needs is in the link to any of your playlists. Yandex Music
hands out two shapes, and both work:

```
# what the share button gives you today — no user needed
https://music.yandex.uz/playlists/ch.448df3eb-daee-408a-a60a-252259db2f3b
       └── tld ──┘                 └──────────── playlist ─────────────┘

# the older shape, still used in the address bar
https://music.yandex.uz/users/your-login/playlists/1000
       └── tld ─┘       └── user ──┘     └ playlist ┘
```

To get that link:

- **Web** — open [music.yandex.com](https://music.yandex.com), go to *My
  music → Playlists* (*Моя музыка → Плейлисты*) and click the playlist. The
  address bar has it.
- **Mobile app** — open the playlist, then *Share → Copy link*
  (*Поделиться → Скопировать ссылку*).

<details>
<summary>Older links, and when <code>user</code> is still needed</summary>

Links of the shape `music.yandex.uz/users/<login>/playlists/<kind>` still work,
but they need both halves, because `kind` is only a number **inside** one
account — `3` is "Liked tracks" for everyone, so on its own it identifies
nothing:

```yaml
user: "your-login"   # public: the name in the URL, not a credential
playlist: "3"
tld: "uz"
```

The only other time `user` matters is asking for `--likes` or `--playlists`
**without** passing a playlist link, since those are about an account rather
than one playlist.

yamu never asks for a password. The only secret it can take is an optional
token for private data, and that stays in your own repository.

</details>

Rather not read URLs? Hand it to yamu:

```console
$ npx github:abdurahmon27/yamu url "https://music.yandex.uz/playlists/ch.448df3eb-daee-408a-a60a-252259db2f3b"
{
  "playlist": "ch.448df3eb-daee-408a-a60a-252259db2f3b",
  "tld": "uz"
}

$ npx github:abdurahmon27/yamu url "https://music.yandex.uz/users/yamusic-top/playlists/1076"
{
  "user": "yamusic-top",
  "playlist": "1076",
  "tld": "uz"
}
```

Or skip the step entirely — pass the whole link as `--playlist` and `--user`
and `--tld` are read from it:

```bash
npx github:abdurahmon27/yamu fetch \
  --playlist "https://music.yandex.uz/playlists/ch.448df3eb-daee-408a-a60a-252259db2f3b" \
  --out music.json
```

**The playlist has to be public** for the tokenless path: on Yandex Music open
the playlist and make sure it is not marked private. A private one needs a
token — see [Tokens](#tokens-and-when-you-do-not-need-one).

## CLI

```
yamu fetch --playlist <link> [options]
yamu card  --in <data.json> --out <card.svg> [options]
yamu url   <music.yandex link>
yamu serve [--port 8787] [--key <secret>] [--token <token>]
```

| Flag | Meaning |
|---|---|
| `--playlist <url\|uuid\|kind>` | The playlist link Yandex Music gives you. A uuid link carries its owner, so nothing else is needed. |
| `--user <uid\|login>` | Only for `--likes` / `--playlists` without a link, or an old-style kind. |
| `--playlists` | Also include the user's public playlist list. |
| `--likes` | Also include liked tracks (needs public music, or a token). |
| `--limit <n>` | Tracks kept per section. Default 20. |
| `--tld <ru\|uz\|com\|by\|kz>` | Yandex Music domain. Default `ru`. |
| `--lang <code>` | Language for titles Yandex localises. Default `en`. |
| `--token <token>` | Only for private data. Prefer a secret over typing it. |
| `--out <file>` | JSON destination. Default `yamu.json`. |
| `--card <file>` | Also render an SVG card. |
| `--theme <name>` | `gruvbox`, `dark`, `light`, `nord`, `tokyonight`. |
| `--cover` | Embed the playlist cover in the card. |
| `--width <px>` | Card width. Default 460. |
| `--title <text>` | Override the card heading. |
| `--no-footer` | Drop the "updated …" line. |
| `--api-base <url>` | A `yamu serve` proxy to fetch through. |
| `--api-key <secret>` | Key for a proxy started with `--key`. |
| `--soft-fail` | On a failed fetch, keep what is on disk and exit 0. |

## Action inputs

`playlist`, `user`, `playlists`, `likes`, `limit`, `tld`, `lang`, `api-base`,
`api-key`, `token`, `out`, `card`, `theme`, `title`, `width`, `cover`,
`soft-fail` — the same meanings as above. `soft-fail` defaults to `true`, so a bad day at Yandex
leaves your committed files untouched and your workflow green.

Outputs: `json` and `card`, the paths that were written.

## The JSON

```jsonc
{
  "generatedAt": "2026-09-28T09:00:00.000Z",
  "source": "yandex-music",
  "tld": "uz",
  "playlist": {
    "uid": "414787002",
    "kind": "1076",
    "title": "Yandex Music Chart",
    "url": "https://music.yandex.uz/users/yamusic-top/playlists/1076",
    "cover": "https://avatars.yandex.net/…/400x400",
    "trackCount": 100,
    "durationMs": 19920000,
    "modified": "2026-09-28T08:38:04+00:00",
    "tracks": [
      {
        "id": "79071659",
        "title": "Лампочки",
        "artists": "ARTIK & ASTI",
        "artistList": [{ "id": "218547", "name": "ARTIK & ASTI" }],
        "album": { "id": "16969949", "title": "Миллениум X" },
        "durationMs": 195780,
        "url": "https://music.yandex.uz/album/16969949/track/79071659",
        "cover": "https://avatars.yandex.net/…/400x400"
      }
    ]
  },
  "likes": { "count": 412, "tracks": [] },
  "playlists": []
}
```

Fields are only present when you asked for them. Anything yamu could not read
comes back `null` rather than missing, so your template never has to guess.

## Themes

| gruvbox | light | nord |
|---|---|---|
| ![gruvbox](./examples/card-gruvbox.svg) | ![light](./examples/card-light.svg) | ![nord](./examples/card-nord.svg) |

The card is deliberately plain: no scripts, no external images, no CSS — GitHub
strips all three from README images. The cover, when you ask for it, is
embedded in the file.

## The proxy

When the fetch has to run on a GitHub runner, put the part that talks to Yandex
on a machine it serves:

```bash
yamu serve --port 8787 --key "$YAMU_KEY"
```

Then point the action at it:

```yaml
      - uses: abdurahmon27/yamu@v1
        with:
          playlist: "https://music.yandex.com/playlists/lk.…"
          api-base: "https://music-proxy.example.com"
          api-key: ${{ secrets.YAMU_KEY }}
```

What the proxy is, precisely:

- **Read-only, and narrow.** `GET` only, and only the five paths yamu reads —
  a playlist by uuid, a playlist by owner and kind, a user's playlist list,
  liked track ids, and track metadata. Everything else is a 404 before any
  request leaves the machine.
- **The token stays there.** If you start it with `--token`, that token is used
  for the forwarded requests and never travels to the caller. Without one, the
  proxy exposes exactly what is already public.
- **Cached.** Identical requests are served from memory for a minute, so a
  handful of repos refreshing daily is a handful of requests.
- **Keyed, if you want.** `--key` requires an `x-yamu-key` header; without it,
  anyone who can reach the port can read what the proxy can read. Put it behind
  TLS — a two-line Caddy or nginx block is enough.

## Tokens, and when you do not need one

You do **not** need a token for a public playlist, a public playlist list, or
likes on a profile whose music is public. Start there.

If you do need one, keep three things in mind:

1. A Yandex OAuth token is not a music key — it is your **Yandex ID**: mail,
   Disk, and everything else on the account. Treat it accordingly.
2. Put it in **your own** repository's secrets (`Settings → Secrets and
   variables → Actions`) and pass it as `token: ${{ secrets.YANDEX_MUSIC_TOKEN }}`.
   yamu never writes it into the JSON, the card or the logs.
3. Revoke it the moment you stop using it, from your Yandex account's
   connected-apps page. Rotating is cheap; regretting is not.

Because everything runs in your repository, there is no service here that could
lose your token — including this one.

## When Yandex changes something

It will. Every call lives in a single file (`src/api.ts`) and every mapping in
another (`src/normalize.ts`), pinned by fixtures captured from real responses.
Fixing a break is usually a few lines plus an updated fixture —
[CONTRIBUTING.md](./CONTRIBUTING.md) walks through it, and pull requests are
welcome.

## Development

```sh
npm install
npm run build   # dist/ is committed — the GitHub Action runs from it
npm test
```

## Not affiliated with Yandex

An independent, unofficial project by fans of the service. It reads the same
public endpoints the web player already calls, at the request of the person who
owns the data. "Yandex" and "Yandex Music" belong to their owners. Use it for
your own account, and check Yandex Music's terms of use before you do anything
clever with it.

MIT © Abdurahmon Mamadiyorov
