/** Public, stable shapes. Everything else in this package is an implementation detail. */

/** Yandex Music runs the same catalogue on several domains; pick the one you listen on. */
export type Tld = "ru" | "uz" | "com" | "by" | "kz";

export interface Artist {
  id?: string;
  name: string;
}

export interface Album {
  id?: string;
  title?: string;
}

export interface Track {
  id: string;
  title: string;
  /** Joined for display convenience; `artistList` keeps the structure. */
  artists: string;
  artistList: Artist[];
  album?: Album;
  durationMs: number;
  /** Link to the track on Yandex Music, or null when the album is unknown. */
  url: string | null;
  /** Cover URL at the requested size, or null when the track has no art. */
  cover: string | null;
}

export interface Playlist {
  uid: string;
  kind: string;
  title: string;
  description: string | null;
  url: string;
  cover: string | null;
  trackCount: number;
  durationMs: number;
  /** ISO timestamp of the last edit, straight from Yandex. */
  modified: string | null;
  owner: PlaylistOwner | null;
  tracks: Track[];
}

export interface PlaylistOwner {
  uid: string;
  login: string | null;
  name: string | null;
}

export interface PlaylistSummary {
  uid: string;
  kind: string;
  title: string;
  url: string;
  cover: string | null;
  trackCount: number;
  modified: string | null;
}

export interface Likes {
  count: number;
  tracks: Track[];
}

/** The file yamu writes. Treat it as the contract between the fetcher and your UI. */
export interface YamuData {
  /** ISO timestamp of the fetch that produced this file. */
  generatedAt: string;
  source: "yandex-music";
  tld: Tld;
  playlist?: Playlist;
  playlists?: PlaylistSummary[];
  likes?: Likes;
}

export interface ClientOptions {
  tld?: Tld;
  /** Yandex OAuth token. Only needed for private data — public playlists work without it. */
  token?: string;
  /** Cover size requested from avatars.yandex.net, e.g. "400x400". */
  coverSize?: string;
  /** Language for titles Yandex localises, e.g. "en", "ru", "uz". Default "en". */
  lang?: string;
  /**
   * Where to send requests instead of `https://api.music.yandex.<tld>` —
   * a `yamu serve` proxy running somewhere Yandex Music answers.
   */
  apiBase?: string;
  /** Shared secret for a proxy started with `yamu serve --key`. */
  apiKey?: string;
  timeoutMs?: number;
  /** Injected in tests. */
  fetchImpl?: typeof fetch;
}
