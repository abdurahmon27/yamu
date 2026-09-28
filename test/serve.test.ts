import assert from "node:assert/strict";
import { test } from "node:test";

import { PROXY_KEY_HEADER } from "../src/api.js";
import { createProxy, isProxyPath } from "../src/serve.js";
import { fixture, stubFetch } from "./helpers.js";

function reply() {
  const sent: { status?: number; body?: string } = {};
  return {
    sent,
    response: {
      writeHead(status: number) {
        sent.status = status;
      },
      end(body?: string) {
        sent.body = body;
      },
    },
  };
}

test("only the endpoints yamu reads are proxied", () => {
  assert.equal(isProxyPath("/playlist/lk.1234"), true);
  assert.equal(isProxyPath("/users/me/playlists/3"), true);
  assert.equal(isProxyPath("/users/me/playlists/list"), true);
  assert.equal(isProxyPath("/users/me/likes/tracks"), true);
  assert.equal(isProxyPath("/tracks?track-ids=1,2"), true);

  assert.equal(isProxyPath("/account/status"), false, "not an endpoint yamu uses");
  assert.equal(isProxyPath("/users/me/playlists/3/change"), false);
  assert.equal(isProxyPath("/"), false);
});

test("forwards an allowed request and caches the answer", async () => {
  const stub = stubFetch([{ body: fixture("playlist") }]);
  const proxy = createProxy({ fetchImpl: stub.fetch, upstream: "https://upstream.test" });

  const first = reply();
  await proxy({ method: "GET", url: "/playlist/lk.1234", headers: {} }, first.response);
  const second = reply();
  await proxy({ method: "GET", url: "/playlist/lk.1234", headers: {} }, second.response);

  assert.equal(first.sent.status, 200);
  assert.equal(second.sent.body, first.sent.body);
  assert.equal(stub.calls.length, 1, "the second call came from the cache");
  assert.equal(stub.calls[0]?.url, "https://upstream.test/playlist/lk.1234");
});

test("the token stays on the proxy", async () => {
  const stub = stubFetch([{ body: fixture("playlist") }]);
  const proxy = createProxy({ fetchImpl: stub.fetch, token: "secret", upstream: "https://upstream.test" });

  const { response } = reply();
  await proxy({ method: "GET", url: "/playlist/lk.1234", headers: {} }, response);

  assert.equal(stub.calls[0]?.headers["Authorization"], "OAuth secret");
});

test("a key is required when one was set", async () => {
  const stub = stubFetch([{ body: fixture("playlist") }]);
  const proxy = createProxy({ fetchImpl: stub.fetch, key: "open-sesame" });

  const denied = reply();
  await proxy({ method: "GET", url: "/playlist/lk.1234", headers: {} }, denied.response);
  assert.equal(denied.sent.status, 401);
  assert.equal(stub.calls.length, 0, "nothing was forwarded");

  const allowed = reply();
  await proxy(
    { method: "GET", url: "/playlist/lk.1234", headers: { [PROXY_KEY_HEADER]: "open-sesame" } },
    allowed.response
  );
  assert.equal(allowed.sent.status, 200);
});

test("refuses anything but GET, and answers /health", async () => {
  const proxy = createProxy({ fetchImpl: stubFetch([{}]).fetch });

  const post = reply();
  await proxy({ method: "POST", url: "/playlist/lk.1", headers: {} }, post.response);
  assert.equal(post.sent.status, 405);

  const health = reply();
  await proxy({ method: "GET", url: "/health", headers: {} }, health.response);
  assert.equal(health.sent.status, 200);
});

test("an upstream failure is reported, not swallowed", async () => {
  const failing = (async () => {
    throw new Error("network down");
  }) as unknown as typeof fetch;
  const proxy = createProxy({ fetchImpl: failing });

  const { sent, response } = reply();
  await proxy({ method: "GET", url: "/playlist/lk.1", headers: {} }, response);

  assert.equal(sent.status, 502);
  assert.match(sent.body ?? "", /network down/);
});
