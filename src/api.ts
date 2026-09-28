/**
 * The only file that talks to Yandex Music.
 *
 * These endpoints are undocumented — they are what the official web player
 * calls. When Yandex changes something, it changes here and nowhere else, which
 * is the whole point of keeping this module small and boring.
 */

import type { ClientOptions, Tld } from "./types.js";

export const DEFAULT_TLD: Tld = "ru";
const DEFAULT_TIMEOUT_MS = 15_000;

export class YamuError extends Error {
  readonly status: number | null;
  readonly endpoint: string;

  constructor(message: string, endpoint: string, status: number | null = null) {
    super(message);
    this.name = "YamuError";
    this.endpoint = endpoint;
    this.status = status;
  }
}

export function apiBase(tld: Tld = DEFAULT_TLD): string {
  return `https://api.music.yandex.${tld}`;
}

export function siteBase(tld: Tld = DEFAULT_TLD): string {
  return `https://music.yandex.${tld}`;
}

async function request(
  endpoint: string,
  options: ClientOptions = {}
): Promise<unknown> {
  const { tld = DEFAULT_TLD, token, lang = "en", timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const doFetch = options.fetchImpl ?? globalThis.fetch;
  const url = `${apiBase(tld)}${endpoint}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Language": lang,
    "User-Agent": "yamu (+https://github.com/abdurahmon27/yamu)",
  };
  if (token) headers["Authorization"] = `OAuth ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await doFetch(url, { headers, signal: controller.signal });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new YamuError(`request failed: ${reason}`, endpoint);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new YamuError(
      response.status === 401 || response.status === 403
        ? "not allowed without a token, or the data is private"
        : `unexpected status ${response.status}`,
      endpoint,
      response.status
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new YamuError("response was not JSON", endpoint, response.status);
  }

  const result = (body as { result?: unknown })?.result;
  if (result === undefined) {
    throw new YamuError("response had no `result` field", endpoint, response.status);
  }
  return result;
}

/** A playlist by owner (numeric uid or login) and kind — the number in its URL. */
export function getPlaylist(
  user: string,
  kind: string,
  options?: ClientOptions
): Promise<unknown> {
  return request(`/users/${encodeURIComponent(user)}/playlists/${encodeURIComponent(kind)}`, options);
}

/**
 * A playlist by its uuid — the `lk.…` value in the links Yandex Music shares
 * today. The response carries the owner, so nothing else is needed.
 */
export function getPlaylistByUuid(uuid: string, options?: ClientOptions): Promise<unknown> {
  return request(`/playlist/${encodeURIComponent(uuid)}`, options);
}

/** Every playlist a user has made public. */
export function getUserPlaylists(user: string, options?: ClientOptions): Promise<unknown> {
  return request(`/users/${encodeURIComponent(user)}/playlists/list`, options);
}

/** Liked track ids. Visible only while the profile's music is public. */
export function getLikedTrackIds(user: string, options?: ClientOptions): Promise<unknown> {
  return request(`/users/${encodeURIComponent(user)}/likes/tracks`, options);
}

/** Full metadata for up to a few hundred track ids. */
export function getTracks(ids: string[], options?: ClientOptions): Promise<unknown> {
  if (ids.length === 0) return Promise.resolve([]);
  return request(`/tracks?track-ids=${ids.map(encodeURIComponent).join(",")}`, options);
}
