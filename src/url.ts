/** Turns the links you copy out of Yandex Music into the bits the API needs. */

import { DEFAULT_TLD } from "./api.js";
import type { Tld } from "./types.js";

const TLDS: Tld[] = ["ru", "uz", "com", "by", "kz"];

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

function tldOf(hostname: string): Tld {
  const suffix = hostname.split(".").pop();
  const match = TLDS.find((tld) => tld === suffix);
  return match ?? DEFAULT_TLD;
}

/**
 * Accepts the usual shapes:
 *   music.yandex.uz/users/<login>/playlists/1000
 *   music.yandex.ru/album/123/track/456
 *   music.yandex.com/album/123
 */
export function parseUrl(input: string): ParsedUrl | null {
  let url: URL;
  try {
    url = new URL(input.includes("://") ? input : `https://${input}`);
  } catch {
    return null;
  }
  if (!/(^|\.)music\.yandex\./.test(url.hostname)) return null;

  const tld = tldOf(url.hostname);
  const parts = url.pathname.split("/").filter(Boolean);

  if (parts[0] === "users" && parts[2] === "playlists" && parts[1] && parts[3]) {
    return { kind: "playlist", tld, user: decodeURIComponent(parts[1]), playlistKind: parts[3] };
  }
  if (parts[0] === "album" && parts[1] && parts[2] === "track" && parts[3]) {
    return { kind: "track", tld, album: parts[1], track: parts[3] };
  }
  if (parts[0] === "album" && parts[1]) {
    return { kind: "album", tld, album: parts[1] };
  }
  return null;
}

/** Same as `parseUrl`, but only accepts playlists — what `yamu fetch` needs. */
export function parsePlaylistUrl(input: string): ParsedPlaylistUrl | null {
  const parsed = parseUrl(input);
  return parsed && parsed.kind === "playlist" ? parsed : null;
}
