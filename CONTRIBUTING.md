# Contributing

The interesting problem with this project is that Yandex Music has no public
API, so everything here rests on endpoints that can change without notice. The
code is arranged so that when they do, the fix is small and obvious.

## Where things live

| File | Job |
|---|---|
| `src/api.ts` | **The only file that talks to Yandex.** Endpoints, headers, errors. |
| `src/normalize.ts` | Raw payloads → the stable shapes in `src/types.ts`. Reads defensively. |
| `src/fetch.ts` | Composes the calls into one `YamuData`. |
| `src/card.ts` | SVG rendering. No network, no state. |
| `src/cli.ts` / `src/action.ts` | Thin wrappers around the above. |

## When Yandex changes something

1. Capture the new response: `curl -s https://api.music.yandex.ru/users/<uid>/playlists/<kind> | head -c 2000`.
2. Update the fixture in `test/fixtures/` with a trimmed copy (a few tracks is
   plenty — keep the file small and free of anyone's personal data).
3. Fix `normalize.ts` (usually) or `api.ts` (if a path or header moved).
4. `npm test` — the fixtures pin the mapping, so a green run means every
   consumer's card still renders.

Please keep the "never break the consumer" rule: a missing field should cost a
line of a card, not the build. That is why every read in `normalize.ts` goes
through the small `asString` / `asNumber` / `asArray` helpers.

## Before you push

```sh
npm run build   # dist/ is committed because the GitHub Action runs from it
npm test
```

Both run in CI as well.

## Scope

Things that belong here: reading public data, rendering it, and making it easy
to drop into a site or a profile README.

Things that do not: anything that needs to hold someone else's token, playback,
downloading audio, or scraping beyond what the official web player already
requests.
