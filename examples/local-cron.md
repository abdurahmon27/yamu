# Refreshing from your own machine

The simplest answer to [the 451 problem](../README.md#where-this-can-run): run
the fetch where Yandex Music already answers — your laptop, or a VPS in a region
it serves — and push the result.

## A shell script

```sh
#!/usr/bin/env sh
# ~/bin/refresh-music.sh
set -e

cd "$HOME/code/my-portfolio"

npx github:abdurahmon27/yamu fetch \
  --playlist "https://music.yandex.com/playlists/lk.…" \
  --limit 6 \
  --out src/data/music.json \
  --soft-fail

git add src/data/music.json
git diff --staged --quiet || {
  git commit -m "chore: refresh music"
  git push
}
```

`--soft-fail` means a laptop that happens to be offline changes nothing and
exits cleanly.

## systemd timer

```ini
# ~/.config/systemd/user/refresh-music.service
[Unit]
Description=Refresh the playlist on my site

[Service]
Type=oneshot
ExecStart=%h/bin/refresh-music.sh
```

```ini
# ~/.config/systemd/user/refresh-music.timer
[Unit]
Description=Refresh the playlist daily

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

```sh
systemctl --user daemon-reload
systemctl --user enable --now refresh-music.timer
```

`Persistent=true` catches up after the machine was asleep, which is the whole
point on a laptop.

## cron, if you prefer

```cron
0 9 * * * $HOME/bin/refresh-music.sh >> $HOME/.cache/refresh-music.log 2>&1
```

## NixOS

```nix
systemd.user.services.refresh-music = {
  description = "Refresh the playlist on my site";
  script = "${config.home.homeDirectory}/bin/refresh-music.sh";
};

systemd.user.timers.refresh-music = {
  wantedBy = [ "timers.target" ];
  timerConfig = {
    OnCalendar = "daily";
    Persistent = true;
  };
};
```
