import assert from "node:assert/strict";
import { test } from "node:test";

import { parsePlaylistUrl, parseUrl } from "../src/url.js";

test("reads a playlist link", () => {
  assert.deepEqual(parseUrl("https://music.yandex.uz/users/yamusic-top/playlists/1076"), {
    kind: "playlist",
    tld: "uz",
    user: "yamusic-top",
    playlistKind: "1076",
  });
});

test("works without a scheme and with query strings", () => {
  const parsed = parsePlaylistUrl("music.yandex.ru/users/me/playlists/3?utm_source=share");
  assert.equal(parsed?.tld, "ru");
  assert.equal(parsed?.playlistKind, "3");
});

test("reads track and album links", () => {
  assert.deepEqual(parseUrl("https://music.yandex.com/album/16969949/track/79071659"), {
    kind: "track",
    tld: "com",
    album: "16969949",
    track: "79071659",
  });
  assert.deepEqual(parseUrl("https://music.yandex.ru/album/16969949"), {
    kind: "album",
    tld: "ru",
    album: "16969949",
  });
});

test("refuses anything that is not Yandex Music", () => {
  assert.equal(parseUrl("https://open.spotify.com/playlist/123"), null);
  assert.equal(parseUrl("not a url"), null);
  assert.equal(parsePlaylistUrl("https://music.yandex.ru/album/1"), null);
});

test("falls back to ru for an unknown domain suffix", () => {
  assert.equal(parseUrl("https://music.yandex.xx/users/a/playlists/1")?.tld, "ru");
});
