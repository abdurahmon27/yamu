/**
 * Optional React bindings.
 *
 * Deliberately unstyled: it renders semantic markup with predictable class
 * names so your own CSS decides how it looks. Give it the JSON that
 * `yamu fetch` wrote — no requests happen at runtime.
 */
import type { ReactNode } from "react";
import type { YamuData } from "../types.js";
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
export declare function YamuPlaylist({ data, limit, showHeader, classPrefix, fallback, }: YamuPlaylistProps): import("react").JSX.Element;
export default YamuPlaylist;
