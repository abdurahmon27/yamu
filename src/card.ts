/**
 * A self-contained SVG card.
 *
 * GitHub proxies README images and strips scripts, external CSS and remote
 * `<image href>`, so everything here is inline: plain shapes, plain text, and
 * an optional cover embedded as a data URI.
 */

import type { Playlist, Track, YamuData } from "./types.js";

export type ThemeName = "gruvbox" | "dark" | "light" | "nord";

export interface Theme {
  background: string;
  border: string;
  title: string;
  text: string;
  muted: string;
  accent: string;
}

export const THEMES: Record<ThemeName, Theme> = {
  gruvbox: {
    background: "#1d2021",
    border: "#3c3836",
    title: "#fe8019",
    text: "#ebdbb2",
    muted: "#928374",
    accent: "#83a598",
  },
  dark: {
    background: "#0d1117",
    border: "#30363d",
    title: "#e6edf3",
    text: "#c9d1d9",
    muted: "#8b949e",
    accent: "#58a6ff",
  },
  light: {
    background: "#ffffff",
    border: "#d0d7de",
    title: "#1f2328",
    text: "#1f2328",
    muted: "#656d76",
    accent: "#0969da",
  },
  nord: {
    background: "#2e3440",
    border: "#3b4252",
    title: "#88c0d0",
    text: "#eceff4",
    muted: "#7b8494",
    accent: "#a3be8c",
  },
};

export interface CardOptions {
  theme?: ThemeName | Theme;
  /** Overrides the heading taken from the data. */
  title?: string;
  /** How many tracks to draw. */
  limit?: number;
  width?: number;
  /** Cover image as a data URI — `yamu card --cover` fills this in. */
  coverDataUri?: string | null;
  /** Hide the "updated …" footer. */
  hideFooter?: boolean;
}

const FONT =
  "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, Consolas, monospace";

const PADDING = 18;
const ROW_HEIGHT = 28;

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Rough but predictable: good enough to avoid text spilling out of the card. */
export function truncate(text: string, maxWidth: number, fontSize: number): string {
  const perChar = fontSize * 0.55;
  const maxChars = Math.max(1, Math.floor(maxWidth / perChar));
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

export function formatDuration(ms: number): string {
  // Floor, the way every music player shows a running time.
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Formatted by hand rather than with `toLocaleDateString`, so the same data
 * produces the same card on every machine and in every CI image.
 */
function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${day} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function resolveTheme(theme: CardOptions["theme"]): Theme {
  if (!theme) return THEMES.gruvbox;
  if (typeof theme === "string") return THEMES[theme] ?? THEMES.gruvbox;
  return theme;
}

interface CardSection {
  heading: string;
  subtitle: string | null;
  tracks: Track[];
}

function sectionOf(data: YamuData, options: CardOptions): CardSection {
  const limit = options.limit ?? 5;

  if (data.playlist) {
    const playlist: Playlist = data.playlist;
    const parts = [`${playlist.trackCount} track${playlist.trackCount === 1 ? "" : "s"}`];
    if (playlist.durationMs > 0) parts.push(formatDuration(playlist.durationMs));
    return {
      heading: options.title ?? playlist.title,
      subtitle: parts.join(" · "),
      tracks: playlist.tracks.slice(0, limit),
    };
  }
  if (data.likes) {
    return {
      heading: options.title ?? "Liked tracks",
      subtitle: `${data.likes.count} track${data.likes.count === 1 ? "" : "s"}`,
      tracks: data.likes.tracks.slice(0, limit),
    };
  }
  return { heading: options.title ?? "Yandex Music", subtitle: null, tracks: [] };
}

export function renderCard(data: YamuData, options: CardOptions = {}): string {
  const theme = resolveTheme(options.theme);
  const width = options.width ?? 460;
  const section = sectionOf(data, options);
  const cover = options.coverDataUri ?? null;

  const headerHeight = cover ? 64 : 46;
  const listTop = PADDING + headerHeight + 6;
  const footerHeight = options.hideFooter ? 0 : 28;
  const height = listTop + section.tracks.length * ROW_HEIGHT + footerHeight + PADDING - 6;

  const textLeft = cover ? PADDING + 64 + 14 : PADDING;
  const rows = section.tracks
    .map((track, index) => renderRow(track, index, { width, listTop, theme }))
    .join("\n");

  const footer = options.hideFooter
    ? ""
    : renderFooter(data, { width, height, theme });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(section.heading)}">`,
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" fill="${theme.background}" stroke="${theme.border}"/>`,
    cover
      ? `<clipPath id="cover-clip"><rect x="${PADDING}" y="${PADDING}" width="64" height="64" rx="6"/></clipPath>\n<image x="${PADDING}" y="${PADDING}" width="64" height="64" href="${cover}" clip-path="url(#cover-clip)" preserveAspectRatio="xMidYMid slice"/>`
      : "",
    `<text x="${textLeft}" y="${PADDING + 16}" font-family="${FONT}" font-size="15" font-weight="600" fill="${theme.title}">${escapeXml(truncate(section.heading, width - textLeft - PADDING, 15))}</text>`,
    section.subtitle
      ? `<text x="${textLeft}" y="${PADDING + 34}" font-family="${MONO}" font-size="11" fill="${theme.muted}">${escapeXml(section.subtitle)}</text>`
      : "",
    rows,
    footer,
    `</svg>`,
  ]
    .filter(Boolean)
    .join("\n");
}

function renderRow(
  track: Track,
  index: number,
  context: { width: number; listTop: number; theme: Theme }
): string {
  const { width, listTop, theme } = context;
  const y = listTop + index * ROW_HEIGHT + 14;
  const duration = formatDuration(track.durationMs);
  const durationWidth = duration.length * 7 + 4;
  const numberWidth = 20;
  const textWidth = width - PADDING * 2 - numberWidth - durationWidth - 10;

  const title = truncate(track.title, textWidth * 0.62, 13);
  const artists = track.artists ? truncate(track.artists, textWidth * 0.38, 11) : "";

  return [
    `<text x="${PADDING}" y="${y}" font-family="${MONO}" font-size="11" fill="${theme.muted}">${String(index + 1).padStart(2, "0")}</text>`,
    `<text x="${PADDING + numberWidth}" y="${y}" font-family="${FONT}" font-size="13" fill="${theme.text}">${escapeXml(title)}${artists ? `<tspan fill="${theme.muted}" font-size="11"> — ${escapeXml(artists)}</tspan>` : ""}</text>`,
    `<text x="${width - PADDING}" y="${y}" text-anchor="end" font-family="${MONO}" font-size="11" fill="${theme.muted}">${escapeXml(duration)}</text>`,
  ].join("\n");
}

function renderFooter(
  data: YamuData,
  context: { width: number; height: number; theme: Theme }
): string {
  const { width, height, theme } = context;
  const updated = formatDate(data.generatedAt);
  const y = height - PADDING + 2;
  return [
    `<text x="${PADDING}" y="${y}" font-family="${MONO}" font-size="10" fill="${theme.accent}">yandex music</text>`,
    updated
      ? `<text x="${width - PADDING}" y="${y}" text-anchor="end" font-family="${MONO}" font-size="10" fill="${theme.muted}">updated ${escapeXml(updated)}</text>`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export interface CoverOptions {
  fetchImpl?: typeof fetch;
  /** Size to request from avatars.yandex.net — the card draws it at 64px. */
  size?: string;
  /** Cards live in git; refuse anything that would bloat the repo. */
  maxBytes?: number;
}

/** Downloads a cover and inlines it, because remote images do not survive GitHub. */
export async function coverDataUri(
  url: string | null,
  options: CoverOptions = {}
): Promise<string | null> {
  if (!url) return null;
  const { fetchImpl = globalThis.fetch, size = "200x200", maxBytes = 200_000 } = options;
  // Covers come back at whatever size the caller asked for; 400x400 is far
  // more than a 64px square needs.
  const smaller = url.replace(/\/\d+x\d+(\?|$)/, `/${size}$1`);

  try {
    const response = await fetchImpl(smaller);
    if (!response.ok) return null;
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) return null;
    const type = response.headers.get("content-type") ?? "image/jpeg";
    return `data:${type};base64,${Buffer.from(buffer).toString("base64")}`;
  } catch {
    return null;
  }
}
