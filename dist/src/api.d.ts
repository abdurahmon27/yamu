/**
 * The only file that talks to Yandex Music.
 *
 * These endpoints are undocumented — they are what the official web player
 * calls. When Yandex changes something, it changes here and nowhere else, which
 * is the whole point of keeping this module small and boring.
 */
import type { ClientOptions, Tld } from "./types.js";
export declare const DEFAULT_TLD: Tld;
export declare class YamuError extends Error {
    readonly status: number | null;
    readonly endpoint: string;
    constructor(message: string, endpoint: string, status?: number | null);
}
export declare function apiBase(tld?: Tld): string;
/** The proxy header `yamu serve --key` checks. */
export declare const PROXY_KEY_HEADER = "x-yamu-key";
export declare function siteBase(tld?: Tld): string;
/** A playlist by owner (numeric uid or login) and kind — the number in its URL. */
export declare function getPlaylist(user: string, kind: string, options?: ClientOptions): Promise<unknown>;
/**
 * A playlist by its uuid — the `lk.…` value in the links Yandex Music shares
 * today. The response carries the owner, so nothing else is needed.
 */
export declare function getPlaylistByUuid(uuid: string, options?: ClientOptions): Promise<unknown>;
/** Every playlist a user has made public. */
export declare function getUserPlaylists(user: string, options?: ClientOptions): Promise<unknown>;
/** Liked track ids. Visible only while the profile's music is public. */
export declare function getLikedTrackIds(user: string, options?: ClientOptions): Promise<unknown>;
/** Full metadata for up to a few hundred track ids. */
export declare function getTracks(ids: string[], options?: ClientOptions): Promise<unknown>;
