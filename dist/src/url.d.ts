/** Turns the links you copy out of Yandex Music into the bits the API needs. */
import type { Tld } from "./types.js";
export interface ParsedPlaylistUrl {
    kind: "playlist";
    tld: Tld;
    user: string;
    playlistKind: string;
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
export type ParsedUrl = ParsedPlaylistUrl | ParsedTrackUrl | ParsedAlbumUrl;
/**
 * Accepts the usual shapes:
 *   music.yandex.uz/users/<login>/playlists/1000
 *   music.yandex.ru/album/123/track/456
 *   music.yandex.com/album/123
 */
export declare function parseUrl(input: string): ParsedUrl | null;
/** Same as `parseUrl`, but only accepts playlists — what `yamu fetch` needs. */
export declare function parsePlaylistUrl(input: string): ParsedPlaylistUrl | null;
