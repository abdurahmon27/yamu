/** The three things yamu can collect, assembled into one `YamuData` file. */
import type { ClientOptions, Likes, Playlist, PlaylistSummary, Track, YamuData } from "./types.js";
export declare function fetchPlaylist(user: string, kind: string, options?: ClientOptions): Promise<Playlist>;
export declare function fetchPlaylists(user: string, options?: ClientOptions): Promise<PlaylistSummary[]>;
export declare function fetchTracks(ids: string[], options?: ClientOptions): Promise<Track[]>;
/**
 * Liked tracks, newest first. Yandex returns ids only, so this hydrates
 * `limit` of them — asking for every like of a heavy listener would be rude.
 */
export declare function fetchLikes(user: string, limit: number, options?: ClientOptions): Promise<Likes>;
export interface CollectOptions extends ClientOptions {
    user: string;
    /** Playlist kind — the number at the end of a playlist URL. */
    playlist?: string;
    /** Include the user's public playlist list. */
    playlists?: boolean;
    /** Include liked tracks. */
    likes?: boolean;
    /** Cap on tracks kept per section. 0 keeps everything the API returned. */
    limit?: number;
}
export declare function collect(options: CollectOptions): Promise<YamuData>;
