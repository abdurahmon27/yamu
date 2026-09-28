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
import { type Server } from "node:http";
import type { Tld } from "./types.js";
export declare const DEFAULT_PORT = 8787;
export declare function isProxyPath(target: string): boolean;
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
export declare function createProxy(options?: ProxyOptions): (request: {
    method?: string;
    url?: string;
    headers: Record<string, string | string[] | undefined>;
}, response: {
    writeHead: (status: number, headers: Record<string, string>) => void;
    end: (body?: string) => void;
}) => Promise<void>;
export declare function startProxy(options?: ProxyOptions & {
    port?: number;
}): Server;
