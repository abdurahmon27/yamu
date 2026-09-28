/**
 * Optional React bindings.
 *
 * Deliberately unstyled: it renders semantic markup with predictable class
 * names so your own CSS decides how it looks. Give it the JSON that
 * `yamu fetch` wrote — no requests happen at runtime.
 */

import type { ReactNode } from "react";

import { formatDuration } from "../card.js";
import type { Track, YamuData } from "../types.js";

export interface YamuPlaylistProps {
  data: YamuData;
  /** How many tracks to render. Defaults to all of them. */
  limit?: number;
  /** Show the playlist heading and track count. Default true. */
  showHeader?: boolean;
  /** Prefix for every generated class name. Default "yamu". */
  classPrefix?: string;
  /** Rendered when the data has no tracks. */
  fallback?: ReactNode;
}

function tracksOf(data: YamuData, limit?: number): Track[] {
  const tracks = data.playlist?.tracks ?? data.likes?.tracks ?? [];
  return typeof limit === "number" ? tracks.slice(0, limit) : tracks;
}

export function YamuPlaylist({
  data,
  limit,
  showHeader = true,
  classPrefix = "yamu",
  fallback = null,
}: YamuPlaylistProps) {
  const tracks = tracksOf(data, limit);
  if (tracks.length === 0) return <>{fallback}</>;

  const title = data.playlist?.title ?? "Liked tracks";
  const href = data.playlist?.url;
  const count = data.playlist?.trackCount ?? data.likes?.count ?? tracks.length;

  return (
    <section className={`${classPrefix}`}>
      {showHeader && (
        <header className={`${classPrefix}-header`}>
          {href ? (
            <a className={`${classPrefix}-title`} href={href} target="_blank" rel="noreferrer">
              {title}
            </a>
          ) : (
            <span className={`${classPrefix}-title`}>{title}</span>
          )}
          <span className={`${classPrefix}-count`}>
            {count} track{count === 1 ? "" : "s"}
          </span>
        </header>
      )}

      <ol className={`${classPrefix}-list`}>
        {tracks.map((track) => (
          <li key={track.id} className={`${classPrefix}-track`}>
            {track.url ? (
              <a
                className={`${classPrefix}-track-title`}
                href={track.url}
                target="_blank"
                rel="noreferrer"
              >
                {track.title}
              </a>
            ) : (
              <span className={`${classPrefix}-track-title`}>{track.title}</span>
            )}
            {track.artists && (
              <span className={`${classPrefix}-track-artists`}>{track.artists}</span>
            )}
            <time className={`${classPrefix}-track-duration`}>
              {formatDuration(track.durationMs)}
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default YamuPlaylist;
