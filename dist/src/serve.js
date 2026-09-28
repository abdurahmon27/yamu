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
import { createServer } from "node:http";
import { PROXY_KEY_HEADER, apiBase } from "./api.js";
export const DEFAULT_PORT = 8787;
/** Exactly the endpoints `src/api.ts` calls, and nothing else. */
const ALLOWED = [
    /^\/playlist\/[^/?]+$/,
    /^\/users\/[^/?]+\/playlists\/[^/?]+$/,
    /^\/users\/[^/?]+\/playlists\/list$/,
    /^\/users\/[^/?]+\/likes\/tracks$/,
    /^\/tracks\?track-ids=[^&]+$/,
];
export function isProxyPath(target) {
    return ALLOWED.some((pattern) => pattern.test(target));
}
export function createProxy(options = {}) {
    const { tld = "ru", token, key, cacheMs = 60_000, fetchImpl = globalThis.fetch, upstream = apiBase(tld), } = options;
    const cache = new Map();
    return async function handle(request, response) {
        const send = (status, body) => {
            response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
            response.end(typeof body === "string" ? body : JSON.stringify(body));
        };
        const target = request.url ?? "/";
        if (target === "/health")
            return send(200, { ok: true });
        if ((request.method ?? "GET") !== "GET")
            return send(405, { error: "only GET" });
        if (key && request.headers[PROXY_KEY_HEADER] !== key) {
            return send(401, { error: "bad or missing key" });
        }
        if (!isProxyPath(target))
            return send(404, { error: "endpoint not proxied" });
        const cached = cache.get(target);
        if (cached && Date.now() - cached.at < cacheMs) {
            return send(cached.status, cached.body);
        }
        const headers = {
            Accept: "application/json",
            "User-Agent": "yamu-proxy (+https://github.com/abdurahmon27/yamu)",
        };
        if (token)
            headers["Authorization"] = `OAuth ${token}`;
        try {
            const upstreamResponse = await fetchImpl(`${upstream}${target}`, { headers });
            const body = await upstreamResponse.text();
            if (upstreamResponse.ok) {
                cache.set(target, { at: Date.now(), status: upstreamResponse.status, body });
            }
            send(upstreamResponse.status, body);
        }
        catch (error) {
            send(502, { error: error instanceof Error ? error.message : "upstream failed" });
        }
    };
}
export function startProxy(options = {}) {
    const handler = createProxy(options);
    const server = createServer((request, response) => {
        void handler({ method: request.method, url: request.url, headers: request.headers }, response);
    });
    server.listen(options.port ?? DEFAULT_PORT);
    return server;
}
