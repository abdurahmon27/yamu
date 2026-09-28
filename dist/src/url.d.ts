/** Turns the links you copy out of Yandex Music into the bits the API needs. */
import type { Tld } from "./types.js";
export interface ParsedPlaylistUrl {
    kind: "playlist";
    tld: Tld;
    user: string;
    playlistKind: string;
}
/** The newer share links carry a uuid and no owner at all. */
export interface ParsedPlaylistUuidUrl {
    kind: "playlist-uuid";
    tld: Tld;
    uuid: string;
}
export interface ParsedTrackUrl {
    kind: "track";
    tld: Tld;
    album: string;
    track: string;
}
export interface ParsedAlbumUrl {
    kind: "album";
    tld: Tld;
    album: string;
}
export type ParsedUrl = ParsedPlaylistUrl | ParsedPlaylistUuidUrl | ParsedTrackUrl | ParsedAlbumUrl;
/** `lk.1234abcd-5678-…` — what Yandex now puts in a share link. */
export declare function looksLikeUuid(value: string): boolean;
/**
 * Accepts the usual shapes:
 *   music.yandex.uz/users/<login>/playlists/1000
 *   music.yandex.uz/playlists/ch.448df3eb-daee-408a-a60a-252259db2f3b
 *   music.yandex.ru/album/123/track/456
 *   music.yandex.com/album/123
 */
export declare function parseUrl(input: string): ParsedUrl | null;
/** Same as `parseUrl`, but only accepts playlists — what `yamu fetch` needs. */
export declare function parsePlaylistUrl(input: string): ParsedPlaylistUrl | ParsedPlaylistUuidUrl | null;
