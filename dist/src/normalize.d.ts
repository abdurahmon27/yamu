/**
 * Raw Yandex payloads in, stable `yamu` shapes out.
 *
 * Everything here reads defensively: a missing field should cost you one line
 * of a card, not the whole build.
 */
import type { Likes, Playlist, PlaylistSummary, Tld, Track } from "./types.js";
export declare const DEFAULT_COVER_SIZE = "400x400";
/**
 * Yandex hands out cover paths with a `%%` size placeholder:
 * `avatars.yandex.net/get-music-content/…/%%`
 */
export declare function coverUrl(uri: unknown, size?: string): string | null;
export declare function toTrack(input: unknown, tld: Tld, coverSize?: string): Track | null;
export declare function playlistUrl(tld: Tld, uid: string, kind: string, login?: string | null): string;
export declare function toPlaylist(input: unknown, tld: Tld, coverSize?: string): Playlist;
export declare function toPlaylistSummaries(input: unknown, tld: Tld, coverSize?: string): PlaylistSummary[];
/** `/likes/tracks` returns ids only — the caller hydrates them with `/tracks`. */
export declare function likedTrackIds(input: unknown): string[];
export declare function toLikes(tracks: Track[], total: number): Likes;
