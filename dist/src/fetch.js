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
    let user = options.user;
    if (options.playlistUuid) {
        const playlist = await fetchPlaylistByUuid(options.playlistUuid, options);
        data.playlist = limit > 0 ? { ...playlist, tracks: playlist.tracks.slice(0, limit) } : playlist;
        // A uuid playlist comes back with its owner, so likes and the playlist
        // list can be collected from the same single link.
        user = user ?? playlist.owner?.uid;
    }
    else if (options.playlist) {
        if (!user)
            throw new Error("a playlist kind needs a user — pass one, or use a playlist link");
        const playlist = await fetchPlaylist(user, options.playlist, options);
        data.playlist = limit > 0 ? { ...playlist, tracks: playlist.tracks.slice(0, limit) } : playlist;
    }
    if (options.playlists) {
        if (!user)
            throw new Error("playlists needs a user, or a playlist link to take one from");
        data.playlists = await fetchPlaylists(user, options);
    }
    if (options.likes) {
        if (!user)
            throw new Error("likes needs a user, or a playlist link to take one from");
        data.likes = await fetchLikes(user, limit > 0 ? limit : 50, options);
    }
    return data;
}
