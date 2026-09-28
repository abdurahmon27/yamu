/**
 * The only file that talks to Yandex Music.
 *
 * These endpoints are undocumented — they are what the official web player
 * calls. When Yandex changes something, it changes here and nowhere else, which
 * is the whole point of keeping this module small and boring.
 */
export const DEFAULT_TLD = "ru";
const DEFAULT_TIMEOUT_MS = 15_000;
export class YamuError extends Error {
    status;
    endpoint;
    constructor(message, endpoint, status = null) {
        super(message);
        this.name = "YamuError";
        this.endpoint = endpoint;
        this.status = status;
    }
}
export function apiBase(tld = DEFAULT_TLD) {
    return `https://api.music.yandex.${tld}`;
}
export function siteBase(tld = DEFAULT_TLD) {
    return `https://music.yandex.${tld}`;
}
async function request(endpoint, options = {}) {
    const { tld = DEFAULT_TLD, token, lang = "en", timeoutMs = DEFAULT_TIMEOUT_MS } = options;
    const doFetch = options.fetchImpl ?? globalThis.fetch;
    const url = `${apiBase(tld)}${endpoint}`;
    const headers = {
        Accept: "application/json",
        "Accept-Language": lang,
        "User-Agent": "yamu (+https://github.com/abdurahmon27/yamu)",
    };
    if (token)
        headers["Authorization"] = `OAuth ${token}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
        response = await doFetch(url, { headers, signal: controller.signal });
    }
    catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new YamuError(`request failed: ${reason}`, endpoint);
    }
    finally {
        clearTimeout(timer);
    }
    if (!response.ok) {
        throw new YamuError(response.status === 401 || response.status === 403
            ? "not allowed without a token, or the data is private"
            : `unexpected status ${response.status}`, endpoint, response.status);
    }
    let body;
    try {
        body = await response.json();
    }
    catch {
        throw new YamuError("response was not JSON", endpoint, response.status);
    }
    const result = body?.result;
    if (result === undefined) {
        throw new YamuError("response had no `result` field", endpoint, response.status);
    }
    return result;
}
/** A playlist by owner (numeric uid or login) and kind — the number in its URL. */
export function getPlaylist(user, kind, options) {
    return request(`/users/${encodeURIComponent(user)}/playlists/${encodeURIComponent(kind)}`, options);
}
/** Every playlist a user has made public. */
export function getUserPlaylists(user, options) {
    return request(`/users/${encodeURIComponent(user)}/playlists/list`, options);
}
/** Liked track ids. Visible only while the profile's music is public. */
export function getLikedTrackIds(user, options) {
    return request(`/users/${encodeURIComponent(user)}/likes/tracks`, options);
}
/** Full metadata for up to a few hundred track ids. */
export function getTracks(ids, options) {
    if (ids.length === 0)
        return Promise.resolve([]);
    return request(`/tracks?track-ids=${ids.map(encodeURIComponent).join(",")}`, options);
}
