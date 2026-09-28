/**
 * Raw Yandex payloads in, stable `yamu` shapes out.
 *
 * Everything here reads defensively: a missing field should cost you one line
 * of a card, not the whole build.
 */
import { siteBase } from "./api.js";
export const DEFAULT_COVER_SIZE = "400x400";
function asRecord(value) {
    return typeof value === "object" && value !== null ? value : {};
}
function asArray(value) {
    return Array.isArray(value) ? value : [];
}
function asString(value) {
    if (typeof value === "string" && value.length > 0)
        return value;
    if (typeof value === "number")
        return String(value);
    return null;
}
function asNumber(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed))
            return parsed;
    }
    return 0;
}
/**
 * Yandex hands out cover paths with a `%%` size placeholder:
 * `avatars.yandex.net/get-music-content/…/%%`
 */
export function coverUrl(uri, size = DEFAULT_COVER_SIZE) {
    const raw = asString(uri);
    if (!raw)
        return null;
    const withSize = raw.includes("%%") ? raw.replace("%%", size) : raw;
    return withSize.startsWith("http") ? withSize : `https://${withSize}`;
}
function artistsOf(raw) {
    return asArray(raw["artists"])
        .map((entry) => {
        const artist = asRecord(entry);
        const name = asString(artist["name"]);
        if (!name)
            return null;
        const id = asString(artist["id"]);
        return id ? { id, name } : { name };
    })
        .filter((artist) => artist !== null);
}
function albumOf(raw) {
    const first = asRecord(asArray(raw["albums"])[0]);
    const id = asString(first["id"]);
    const title = asString(first["title"]);
    if (!id && !title)
        return undefined;
    return { ...(id ? { id } : {}), ...(title ? { title } : {}) };
}
export function toTrack(input, tld, coverSize = DEFAULT_COVER_SIZE) {
    const wrapper = asRecord(input);
    // Playlist entries wrap the track; /tracks returns it bare.
    const raw = asRecord(wrapper["track"] ?? wrapper);
    const id = asString(raw["id"]) ?? asString(wrapper["id"]);
    const title = asString(raw["title"]);
    if (!id || !title)
        return null;
    const artistList = artistsOf(raw);
    const album = albumOf(raw);
    const version = asString(raw["version"]);
    return {
        id,
        title: version ? `${title} (${version})` : title,
        artists: artistList.map((artist) => artist.name).join(", "),
        artistList,
        ...(album ? { album } : {}),
        durationMs: asNumber(raw["durationMs"]),
        url: album?.id ? `${siteBase(tld)}/album/${album.id}/track/${id}` : null,
        cover: coverUrl(raw["coverUri"], coverSize),
    };
}
function ownerOf(raw) {
    const owner = asRecord(raw["owner"]);
    const uid = asString(owner["uid"]);
    if (!uid)
        return null;
    return {
        uid,
        login: asString(owner["login"]),
        name: asString(owner["name"]),
    };
}
export function playlistUrl(tld, uid, kind, login) {
    return `${siteBase(tld)}/users/${login ?? uid}/playlists/${kind}`;
}
export function toPlaylist(input, tld, coverSize = DEFAULT_COVER_SIZE) {
    const raw = asRecord(input);
    const owner = ownerOf(raw);
    const uid = asString(raw["uid"]) ?? owner?.uid ?? "";
    const kind = asString(raw["kind"]) ?? "";
    const tracks = asArray(raw["tracks"])
        .map((entry) => toTrack(entry, tld, coverSize))
        .filter((track) => track !== null);
    return {
        uid,
        kind,
        title: asString(raw["title"]) ?? "Playlist",
        description: asString(raw["description"]),
        url: playlistUrl(tld, uid, kind, owner?.login),
        cover: coverUrl(asRecord(raw["cover"])["uri"], coverSize),
        trackCount: asNumber(raw["trackCount"]) || tracks.length,
        durationMs: asNumber(raw["durationMs"]),
        modified: asString(raw["modified"]),
        owner,
        tracks,
    };
}
export function toPlaylistSummaries(input, tld, coverSize = DEFAULT_COVER_SIZE) {
    return asArray(input)
        .map((entry) => {
        const raw = asRecord(entry);
        const owner = ownerOf(raw);
        const uid = asString(raw["uid"]) ?? owner?.uid;
        const kind = asString(raw["kind"]);
        const title = asString(raw["title"]);
        if (!uid || !kind || !title)
            return null;
        return {
            uid,
            kind,
            title,
            url: playlistUrl(tld, uid, kind, owner?.login),
            cover: coverUrl(asRecord(raw["cover"])["uri"], coverSize),
            trackCount: asNumber(raw["trackCount"]),
            modified: asString(raw["modified"]),
        };
    })
        .filter((summary) => summary !== null);
}
/** `/likes/tracks` returns ids only — the caller hydrates them with `/tracks`. */
export function likedTrackIds(input) {
    const library = asRecord(asRecord(input)["library"]);
    return asArray(library["tracks"])
        .map((entry) => asString(asRecord(entry)["id"]))
        .filter((id) => id !== null);
}
export function toLikes(tracks, total) {
    return { count: total, tracks };
}
