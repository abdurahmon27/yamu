import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatDuration } from "../card.js";
function tracksOf(data, limit) {
    const tracks = data.playlist?.tracks ?? data.likes?.tracks ?? [];
    return typeof limit === "number" ? tracks.slice(0, limit) : tracks;
}
export function YamuPlaylist({ data, limit, showHeader = true, classPrefix = "yamu", fallback = null, }) {
    const tracks = tracksOf(data, limit);
    if (tracks.length === 0)
        return _jsx(_Fragment, { children: fallback });
    const title = data.playlist?.title ?? "Liked tracks";
    const href = data.playlist?.url;
    const count = data.playlist?.trackCount ?? data.likes?.count ?? tracks.length;
    return (_jsxs("section", { className: `${classPrefix}`, children: [showHeader && (_jsxs("header", { className: `${classPrefix}-header`, children: [href ? (_jsx("a", { className: `${classPrefix}-title`, href: href, target: "_blank", rel: "noreferrer", children: title })) : (_jsx("span", { className: `${classPrefix}-title`, children: title })), _jsxs("span", { className: `${classPrefix}-count`, children: [count, " track", count === 1 ? "" : "s"] })] })), _jsx("ol", { className: `${classPrefix}-list`, children: tracks.map((track) => (_jsxs("li", { className: `${classPrefix}-track`, children: [track.url ? (_jsx("a", { className: `${classPrefix}-track-title`, href: track.url, target: "_blank", rel: "noreferrer", children: track.title })) : (_jsx("span", { className: `${classPrefix}-track-title`, children: track.title })), track.artists && (_jsx("span", { className: `${classPrefix}-track-artists`, children: track.artists })), _jsx("time", { className: `${classPrefix}-track-duration`, children: formatDuration(track.durationMs) })] }, track.id))) })] }));
}
export default YamuPlaylist;
