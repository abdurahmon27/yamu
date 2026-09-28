/** The three things yamu can collect, assembled into one `YamuData` file. */
import { DEFAULT_TLD, getLikedTrackIds, getPlaylist, getPlaylistByUuid, getTracks, getUserPlaylists, } from "./api.js";
import { DEFAULT_COVER_SIZE, likedTrackIds, toLikes, toPlaylist, toPlaylistSummaries, toTrack, } from "./normalize.js";
/** Yandex accepts a few hundred ids per call; stay well under it. */
const TRACK_BATCH = 100;
export async function fetchPlaylist(user, kind, options = {}) {
    const tld = options.tld ?? DEFAULT_TLD;
    const raw = await getPlaylist(user, kind, options);
    return toPlaylist(raw, tld, options.coverSize ?? DEFAULT_COVER_SIZE);
}
export async function fetchPlaylistByUuid(uuid, options = {}) {
    const tld = options.tld ?? DEFAULT_TLD;
    const raw = await getPlaylistByUuid(uuid, options);
    return toPlaylist(raw, tld, options.coverSize ?? DEFAULT_COVER_SIZE);
}
export async function fetchPlaylists(user, options = {}) {
    const tld = options.tld ?? DEFAULT_TLD;
    const raw = await getUserPlaylists(user, options);
    return toPlaylistSummaries(raw, tld, options.coverSize ?? DEFAULT_COVER_SIZE);
}
export async function fetchTracks(ids, options = {}) {
    const tld = options.tld ?? DEFAULT_TLD;
    const coverSize = options.coverSize ?? DEFAULT_COVER_SIZE;
    const collected = [];
    for (let index = 0; index < ids.length; index += TRACK_BATCH) {
        const batch = ids.slice(index, index + TRACK_BATCH);
        const raw = await getTracks(batch, options);
        for (const entry of Array.isArray(raw) ? raw : []) {
            const track = toTrack(entry, tld, coverSize);
            if (track)
                collected.push(track);
        }
    }
    return collected;
}
/**
 * Liked tracks, newest first. Yandex returns ids only, so this hydrates
 * `limit` of them — asking for every like of a heavy listener would be rude.
 */
export async function fetchLikes(user, limit, options = {}) {
    const raw = await getLikedTrackIds(user, options);
    const ids = likedTrackIds(raw);
    const wanted = limit > 0 ? ids.slice(0, limit) : ids;
    const tracks = await fetchTracks(wanted, options);
    return toLikes(tracks, ids.length);
}
export async function collect(options) {
    const tld = options.tld ?? DEFAULT_TLD;
    const limit = options.limit ?? 0;
    const data = {
        generatedAt: new Date().toISOString(),
        source: "yandex-music",
        tld,
    };
    if (options.playlistUuid) {
        const playlist = await fetchPlaylistByUuid(options.playlistUuid, options);
        data.playlist = limit > 0 ? { ...playlist, tracks: playlist.tracks.slice(0, limit) } : playlist;
    }
    else if (options.playlist) {
        if (!options.user)
            throw new Error("a playlist kind needs a user — pass one, or use a uuid");
        const playlist = await fetchPlaylist(options.user, options.playlist, options);
        data.playlist = limit > 0 ? { ...playlist, tracks: playlist.tracks.slice(0, limit) } : playlist;
    }
    if (options.playlists) {
        if (!options.user)
            throw new Error("--playlists needs a user");
        data.playlists = await fetchPlaylists(options.user, options);
    }
    if (options.likes) {
        if (!options.user)
            throw new Error("--likes needs a user");
        data.likes = await fetchLikes(options.user, limit > 0 ? limit : 50, options);
    }
    return data;
}
