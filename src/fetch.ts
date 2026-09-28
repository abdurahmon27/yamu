/** The three things yamu can collect, assembled into one `YamuData` file. */

import { DEFAULT_TLD, getLikedTrackIds, getPlaylist, getTracks, getUserPlaylists } from "./api.js";
import {
  DEFAULT_COVER_SIZE,
  likedTrackIds,
  toLikes,
  toPlaylist,
  toPlaylistSummaries,
  toTrack,
} from "./normalize.js";
import type { ClientOptions, Likes, Playlist, PlaylistSummary, Track, YamuData } from "./types.js";

/** Yandex accepts a few hundred ids per call; stay well under it. */
const TRACK_BATCH = 100;

export async function fetchPlaylist(
  user: string,
  kind: string,
  options: ClientOptions = {}
): Promise<Playlist> {
  const tld = options.tld ?? DEFAULT_TLD;
  const raw = await getPlaylist(user, kind, options);
  return toPlaylist(raw, tld, options.coverSize ?? DEFAULT_COVER_SIZE);
}

export async function fetchPlaylists(
  user: string,
  options: ClientOptions = {}
): Promise<PlaylistSummary[]> {
  const tld = options.tld ?? DEFAULT_TLD;
  const raw = await getUserPlaylists(user, options);
  return toPlaylistSummaries(raw, tld, options.coverSize ?? DEFAULT_COVER_SIZE);
}

export async function fetchTracks(
  ids: string[],
  options: ClientOptions = {}
): Promise<Track[]> {
  const tld = options.tld ?? DEFAULT_TLD;
  const coverSize = options.coverSize ?? DEFAULT_COVER_SIZE;
  const collected: Track[] = [];

  for (let index = 0; index < ids.length; index += TRACK_BATCH) {
    const batch = ids.slice(index, index + TRACK_BATCH);
    const raw = await getTracks(batch, options);
    for (const entry of Array.isArray(raw) ? raw : []) {
      const track = toTrack(entry, tld, coverSize);
      if (track) collected.push(track);
    }
  }
  return collected;
}

/**
 * Liked tracks, newest first. Yandex returns ids only, so this hydrates
 * `limit` of them — asking for every like of a heavy listener would be rude.
 */
export async function fetchLikes(
  user: string,
  limit: number,
  options: ClientOptions = {}
): Promise<Likes> {
  const raw = await getLikedTrackIds(user, options);
  const ids = likedTrackIds(raw);
  const wanted = limit > 0 ? ids.slice(0, limit) : ids;
  const tracks = await fetchTracks(wanted, options);
  return toLikes(tracks, ids.length);
}

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

export async function collect(options: CollectOptions): Promise<YamuData> {
  const tld = options.tld ?? DEFAULT_TLD;
  const limit = options.limit ?? 0;
  const data: YamuData = {
    generatedAt: new Date().toISOString(),
    source: "yandex-music",
    tld,
  };

  if (options.playlist) {
    const playlist = await fetchPlaylist(options.user, options.playlist, options);
    data.playlist = limit > 0 ? { ...playlist, tracks: playlist.tracks.slice(0, limit) } : playlist;
  }
  if (options.playlists) {
    data.playlists = await fetchPlaylists(options.user, options);
  }
  if (options.likes) {
    data.likes = await fetchLikes(options.user, limit > 0 ? limit : 50, options);
  }
  return data;
}
