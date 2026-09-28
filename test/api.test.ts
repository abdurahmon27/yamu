import assert from "node:assert/strict";
import { test } from "node:test";

import { YamuError, getPlaylist, getTracks } from "../src/api.js";
import { fixture, stubFetch } from "./helpers.js";

test("builds the playlist endpoint on the chosen domain", async () => {
  const stub = stubFetch([{ body: fixture("playlist") }]);
  await getPlaylist("yamusic-top", "1076", { tld: "uz", fetchImpl: stub.fetch });

  assert.equal(stub.calls[0]?.url, "https://api.music.yandex.uz/users/yamusic-top/playlists/1076");
  assert.equal(stub.calls[0]?.headers["Authorization"], undefined, "no token, no header");
});

test("sends the token only when one is given", async () => {
  const stub = stubFetch([{ body: fixture("playlist") }]);
  await getPlaylist("me", "3", { token: "secret", fetchImpl: stub.fetch });

  assert.equal(stub.calls[0]?.headers["Authorization"], "OAuth secret");
});

test("batches track ids into one query", async () => {
  const stub = stubFetch([{ body: fixture("tracks") }]);
  await getTracks(["1", "2", "3"], { fetchImpl: stub.fetch });

  assert.equal(stub.calls[0]?.url, "https://api.music.yandex.ru/tracks?track-ids=1,2,3");
});

test("asking for no tracks makes no request", async () => {
  const stub = stubFetch([{ body: { result: [] } }]);
  const tracks = await getTracks([], { fetchImpl: stub.fetch });

  assert.deepEqual(tracks, []);
  assert.equal(stub.calls.length, 0);
});

test("401 becomes a readable error", async () => {
  const stub = stubFetch([{ status: 401, body: { error: "unauthorized" } }]);

  await assert.rejects(
    () => getPlaylist("me", "3", { fetchImpl: stub.fetch }),
    (error: unknown) => {
      assert.ok(error instanceof YamuError);
      assert.equal(error.status, 401);
      assert.match(error.message, /token|private/);
      return true;
    }
  );
});

test("a response without `result` is treated as a broken endpoint", async () => {
  const stub = stubFetch([{ body: { invocationInfo: {} } }]);

  await assert.rejects(
    () => getPlaylist("me", "3", { fetchImpl: stub.fetch }),
    /no `result` field/
  );
});

test("non-JSON is reported, not thrown raw", async () => {
  const stub = stubFetch([{ text: "<html>nope</html>" }]);

  await assert.rejects(() => getPlaylist("me", "3", { fetchImpl: stub.fetch }), /not JSON/);
});

test("--api-base sends the request to the proxy instead", async () => {
  const stub = stubFetch([{ body: fixture("playlist") }]);
  await getPlaylist("me", "3", {
    apiBase: "https://music-proxy.example.com/",
    apiKey: "open-sesame",
    fetchImpl: stub.fetch,
  });

  assert.equal(stub.calls[0]?.url, "https://music-proxy.example.com/users/me/playlists/3");
  assert.equal(stub.calls[0]?.headers["x-yamu-key"], "open-sesame");
});

test("451 explains itself", async () => {
  const stub = stubFetch([{ status: 451, body: { error: "region" } }]);

  await assert.rejects(
    () => getPlaylist("me", "3", { fetchImpl: stub.fetch }),
    /region \(451\)/
  );
});
