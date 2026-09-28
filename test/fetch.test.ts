import assert from "node:assert/strict";
import { test } from "node:test";

import { collect, fetchLikes } from "../src/fetch.js";
import { fixture, stubFetch } from "./helpers.js";

test("collect builds one file from the parts you asked for", async () => {
  const stub = stubFetch([{ body: fixture("playlist") }]);
  const data = await collect({ user: "yamusic-top", playlist: "1076", tld: "uz", fetchImpl: stub.fetch });

  assert.equal(data.source, "yandex-music");
  assert.equal(data.tld, "uz");
  assert.equal(data.playlist?.tracks.length, 3);
  assert.ok(Date.parse(data.generatedAt) > 0);
  assert.equal(data.likes, undefined, "nothing was asked for, nothing was fetched");
});

test("limit trims the playlist", async () => {
  const stub = stubFetch([{ body: fixture("playlist") }]);
  const data = await collect({ user: "me", playlist: "3", limit: 1, fetchImpl: stub.fetch });

  assert.equal(data.playlist?.tracks.length, 1);
  assert.equal(data.playlist?.trackCount, 100, "the real total is kept");
});

test("likes are hydrated from ids", async () => {
  const stub = stubFetch([{ body: fixture("likes") }, { body: fixture("tracks") }]);
  const likes = await fetchLikes("me", 2, { fetchImpl: stub.fetch });

  assert.equal(likes.count, 2);
  assert.equal(likes.tracks.length, 2);
  assert.match(stub.calls[0]!.url, /\/users\/me\/likes\/tracks$/);
  assert.match(stub.calls[1]!.url, /\/tracks\?track-ids=79071659,154651895$/);
});

test("a uuid playlist supplies the owner for likes", async () => {
  const stub = stubFetch([
    { body: fixture("playlist") },
    { body: fixture("likes") },
    { body: fixture("tracks") },
  ]);

  const data = await collect({
    playlistUuid: "lk.1234abcd-5678-4abc-9def-1234567890ab",
    likes: true,
    limit: 2,
    fetchImpl: stub.fetch,
  });

  assert.equal(data.playlist?.owner?.uid, "414787002");
  assert.equal(data.likes?.tracks.length, 2);
  assert.match(stub.calls[0]!.url, /\/playlist\/lk\./);
  assert.match(stub.calls[1]!.url, /\/users\/414787002\/likes\/tracks$/, "owner came from the playlist");
});

test("without a user or a uuid, likes says so instead of guessing", async () => {
  const stub = stubFetch([{ body: fixture("likes") }]);

  await assert.rejects(
    () => collect({ likes: true, fetchImpl: stub.fetch }),
    /needs a user/
  );
});
