import { readFileSync } from "node:fs";

/** Fixtures are trimmed copies of real responses — see CONTRIBUTING.md. */
export function fixture<T = unknown>(name: string): T {
  const url = new URL(`../../test/fixtures/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, "utf8")) as T;
}

export function result<T = unknown>(name: string): T {
  return (fixture(name) as { result: T }).result;
}

/** A fetch stand-in that records calls and replays canned responses. */
export function stubFetch(
  responses: Array<{ status?: number; body?: unknown; text?: string }>
): { fetch: typeof fetch; calls: Array<{ url: string; headers: Record<string, string> }> } {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  let index = 0;

  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const canned = responses[Math.min(index++, responses.length - 1)] ?? {};
    const status = canned.status ?? 200;
    const payload = canned.text ?? JSON.stringify(canned.body ?? { result: {} });
    return new Response(payload, { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  return { fetch: impl, calls };
}
