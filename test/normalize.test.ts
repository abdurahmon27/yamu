import assert from "node:assert/strict";
import { test } from "node:test";

import { coverUrl, likedTrackIds, toPlaylist, toPlaylistSummaries, toTrack } from "../src/normalize.js";
import { result } from "./helpers.js";

test("toPlaylist maps the fields a card needs", () => {
  const playlist = toPlaylist(result("playlist"), "uz");

  assert.equal(playlist.title, "Чарт Яндекс Музыки 🇺🇿");
  assert.equal(playlist.uid, "414787002");
  assert.equal(playlist.kind, "1076");
  assert.equal(playlist.trackCount, 100);
  assert.ok(playlist.durationMs > 0);
  assert.equal(playlist.tracks.length, 3);
  assert.equal(playlist.owner?.login, "yamusic-top");
  assert.equal(playlist.url, "https://music.yandex.uz/users/yamusic-top/playlists/1076");
});

test("toPlaylist keeps track order and joins artists", () => {
  const playlist = toPlaylist(result("playlist"), "ru");
  const first = playlist.tracks[0]!;

  assert.equal(first.title, "Лампочки");
  assert.equal(first.artists, "ARTIK & ASTI");
  assert.equal(first.artistList.length, 1);
  assert.ok(first.durationMs > 0);
  assert.equal(first.url, `https://music.yandex.ru/album/${first.album?.id}/track/${first.id}`);
  assert.match(first.cover ?? "", /^https:\/\/avatars\.yandex\.net\/.+400x400$/);
});

test("toTrack accepts both a playlist entry and a bare track", () => {
  const [bare] = result<unknown[]>("tracks");
  const track = toTrack(bare, "ru");

  assert.ok(track);
  assert.equal(track.id, "79071659");
  assert.equal(track.artists, "ARTIK & ASTI");
});

test("toTrack returns null instead of throwing on junk", () => {
  assert.equal(toTrack({}, "ru"), null);
  assert.equal(toTrack(null, "ru"), null);
  assert.equal(toTrack({ track: { id: "1" } }, "ru"), null, "a track without a title is unusable");
});

test("a track keeps rendering when Yandex drops a field", () => {
  const track = toTrack({ id: "1", title: "Untitled", durationMs: 1000 }, "ru");

  assert.ok(track);
  assert.equal(track.artists, "");
  assert.equal(track.url, null, "no album means no link, not a broken one");
  assert.equal(track.cover, null);
});

test("coverUrl fills the size placeholder", () => {
  assert.equal(
    coverUrl("avatars.yandex.net/get-music-content/1/2.a.3-1/%%", "200x200"),
    "https://avatars.yandex.net/get-music-content/1/2.a.3-1/200x200"
  );
  assert.equal(coverUrl(null), null);
  assert.equal(coverUrl(""), null);
});

test("toPlaylistSummaries skips entries it cannot use", () => {
  const summaries = toPlaylistSummaries(
    [...result<unknown[]>("playlists-list"), { title: "no ids here" }],
    "ru"
  );

  assert.equal(summaries.length, 2);
  assert.ok(summaries[0]!.url.startsWith("https://music.yandex.ru/users/"));
});

test("likedTrackIds pulls ids out of the library payload", () => {
  assert.deepEqual(likedTrackIds(result("likes")), ["79071659", "154651895"]);
  assert.deepEqual(likedTrackIds({}), []);
});
