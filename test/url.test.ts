import assert from "node:assert/strict";
import { test } from "node:test";

import { looksLikeUuid, parsePlaylistUrl, parseUrl } from "../src/url.js";

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
  assert.equal(parsed?.kind, "playlist");
  assert.equal(parsed?.tld, "ru");
  assert.equal(parsed?.kind === "playlist" ? parsed.playlistKind : null, "3");
});

test("reads the newer uuid share link", () => {
  assert.deepEqual(
    parseUrl("https://music.yandex.uz/playlists/ch.448df3eb-daee-408a-a60a-252259db2f3b"),
    {
      kind: "playlist-uuid",
      tld: "uz",
      uuid: "ch.448df3eb-daee-408a-a60a-252259db2f3b",
    }
  );
});

test("looksLikeUuid tells a uuid from a playlist kind", () => {
  assert.equal(looksLikeUuid("ch.448df3eb-daee-408a-a60a-252259db2f3b"), true);
  assert.equal(looksLikeUuid("1234abcd-5678-4abc-9def-1234567890ab"), true);
  assert.equal(looksLikeUuid("1076"), false);
  assert.equal(looksLikeUuid("3"), false);
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
  assert.equal(parseUrl("https://music.yandex.ru"), null);
});

test("falls back to ru for an unknown domain suffix", () => {
  assert.equal(parseUrl("https://music.yandex.xx/users/a/playlists/1")?.tld, "ru");
});
