/**
 * A self-contained SVG card.
 *
 * GitHub proxies README images and strips scripts, external CSS and remote
 * `<image href>`, so everything here is inline: plain shapes, plain text, and
 * an optional cover embedded as a data URI.
 */
import type { YamuData } from "./types.js";
export type ThemeName = "gruvbox" | "dark" | "light" | "nord" | "tokyonight";
export interface Theme {
    background: string;
    border: string;
    title: string;
    text: string;
    muted: string;
    accent: string;
}
export declare const THEMES: Record<ThemeName, Theme>;
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
export declare function escapeXml(value: string): string;
/** Rough but predictable: good enough to avoid text spilling out of the card. */
export declare function truncate(text: string, maxWidth: number, fontSize: number): string;
export declare function formatDuration(ms: number): string;
export declare function renderCard(data: YamuData, options?: CardOptions): string;
export interface CoverOptions {
    fetchImpl?: typeof fetch;
    /** Size to request from avatars.yandex.net — the card draws it at 64px. */
    size?: string;
    /** Cards live in git; refuse anything that would bloat the repo. */
    maxBytes?: number;
}
/** Downloads a cover and inlines it, because remote images do not survive GitHub. */
export declare function coverDataUri(url: string | null, options?: CoverOptions): Promise<string | null>;
