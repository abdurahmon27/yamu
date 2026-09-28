/**
 * A tiny read-only proxy.
 *
 * Yandex Music only serves some countries; everywhere else — including every
 * GitHub-hosted runner — it answers 451. Run this on a machine it does serve
 * and point `yamu fetch --api-base` at it, and the fetch works from anywhere.
 *
 * It forwards nothing but the handful of endpoints yamu reads, only GET, and
 * only with the token it was started with — callers never send one.
 */

import { createServer, type Server } from "node:http";

import { PROXY_KEY_HEADER, apiBase } from "./api.js";
import type { Tld } from "./types.js";

export const DEFAULT_PORT = 8787;

/** Exactly the endpoints `src/api.ts` calls, and nothing else. */
const ALLOWED = [
  /^\/playlist\/[^/?]+$/,
  /^\/users\/[^/?]+\/playlists\/[^/?]+$/,
  /^\/users\/[^/?]+\/playlists\/list$/,
  /^\/users\/[^/?]+\/likes\/tracks$/,
  /^\/tracks\?track-ids=[^&]+$/,
];

export function isProxyPath(target: string): boolean {
  return ALLOWED.some((pattern) => pattern.test(target));
}

export interface ProxyOptions {
  tld?: Tld;
  /** Optional Yandex token, used for every forwarded request. Stays here. */
  token?: string;
  /** When set, callers must send it as the x-yamu-key header. */
  key?: string;
  /** How long an identical request is served from memory. Default 60s. */
  cacheMs?: number;
  fetchImpl?: typeof fetch;
  /** Overrides the upstream, for tests. */
  upstream?: string;
}

interface CacheEntry {
  at: number;
  status: number;
  body: string;
}

export function createProxy(options: ProxyOptions = {}) {
  const {
    tld = "ru",
    token,
    key,
    cacheMs = 60_000,
    fetchImpl = globalThis.fetch,
    upstream = apiBase(tld),
  } = options;
  const cache = new Map<string, CacheEntry>();

  return async function handle(
    request: { method?: string; url?: string; headers: Record<string, string | string[] | undefined> },
    response: {
      writeHead: (status: number, headers: Record<string, string>) => void;
      end: (body?: string) => void;
    }
  ): Promise<void> {
    const send = (status: number, body: unknown) => {
      response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
      response.end(typeof body === "string" ? body : JSON.stringify(body));
    };

    const target = request.url ?? "/";

    if (target === "/health") return send(200, { ok: true });
    if ((request.method ?? "GET") !== "GET") return send(405, { error: "only GET" });
    if (key && request.headers[PROXY_KEY_HEADER] !== key) {
      return send(401, { error: "bad or missing key" });
    }
    if (!isProxyPath(target)) return send(404, { error: "endpoint not proxied" });

    const cached = cache.get(target);
    if (cached && Date.now() - cached.at < cacheMs) {
      return send(cached.status, cached.body);
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "yamu-proxy (+https://github.com/abdurahmon27/yamu)",
    };
    if (token) headers["Authorization"] = `OAuth ${token}`;

    try {
      const upstreamResponse = await fetchImpl(`${upstream}${target}`, { headers });
      const body = await upstreamResponse.text();
      if (upstreamResponse.ok) {
        cache.set(target, { at: Date.now(), status: upstreamResponse.status, body });
      }
      send(upstreamResponse.status, body);
    } catch (error) {
      send(502, { error: error instanceof Error ? error.message : "upstream failed" });
    }
  };
}

export function startProxy(options: ProxyOptions & { port?: number } = {}): Server {
  const handler = createProxy(options);
  const server = createServer((request, response) => {
    void handler(
      { method: request.method, url: request.url, headers: request.headers },
      response
    );
  });
  server.listen(options.port ?? DEFAULT_PORT);
  return server;
}
