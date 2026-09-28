import assert from "node:assert/strict";
import { test } from "node:test";

import { escapeXml, formatDuration, renderCard, truncate } from "../src/card.js";
import { toPlaylist } from "../src/normalize.js";
import { result } from "./helpers.js";
import type { YamuData } from "../src/types.js";

function data(): YamuData {
  return {
    generatedAt: "2026-09-28T09:00:00.000Z",
    source: "yandex-music",
    tld: "uz",
    playlist: toPlaylist(result("playlist"), "uz"),
  };
}

test("renders a standalone svg", () => {
  const svg = renderCard(data());

  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /<\/svg>$/);
  assert.ok(!svg.includes("<script"), "cards must survive GitHub's proxy");
  assert.ok(!svg.includes("http://www.w3.org/1999/xhtml"), "no foreignObject either");
});

test("draws the tracks it was asked for", () => {
  const svg = renderCard(data(), { limit: 2 });

  assert.ok(svg.includes("Лампочки"));
  assert.ok(!svg.includes("Xatlar"), "third track was out of the limit");
  assert.ok(svg.includes("updated 28 Sep 2026"));
});

test("themes change the colours, not the markup", () => {
  const gruvbox = renderCard(data(), { theme: "gruvbox", limit: 1 });
  const light = renderCard(data(), { theme: "light", limit: 1 });

  assert.ok(gruvbox.includes("#1d2021"));
  assert.ok(light.includes("#ffffff"));
  assert.equal(gruvbox.split("\n").length, light.split("\n").length);
});

test("escapes anything that would break the xml", () => {
  const withMarkup: YamuData = {
    ...data(),
    playlist: {
      ...data().playlist!,
      title: 'Rock & <Roll> "best"',
    },
  };
  const svg = renderCard(withMarkup, { limit: 1 });

  assert.ok(svg.includes("Rock &amp; &lt;Roll&gt;"));
  assert.ok(!svg.includes("<Roll>"));
});

test("a card with no tracks still renders", () => {
  const empty: YamuData = { generatedAt: "2026-09-28T09:00:00.000Z", source: "yandex-music", tld: "ru" };
  const svg = renderCard(empty);

  assert.match(svg, /<svg/);
  assert.ok(svg.includes("Yandex Music"));
});

test("falls back to likes when there is no playlist", () => {
  const likes: YamuData = {
    generatedAt: "2026-09-28T09:00:00.000Z",
    source: "yandex-music",
    tld: "ru",
    likes: { count: 2, tracks: toPlaylist(result("playlist"), "ru").tracks.slice(0, 2) },
  };

  assert.ok(renderCard(likes).includes("Liked tracks"));
});

test("formatDuration reads as a running time", () => {
  assert.equal(formatDuration(195780), "3:15");
  assert.equal(formatDuration(3_600_000), "1h 0m");
  assert.equal(formatDuration(0), "0:00");
});

test("truncate keeps text inside the card", () => {
  assert.equal(truncate("short", 500, 13), "short");
  assert.ok(truncate("a".repeat(200), 100, 13).endsWith("…"));
});

test("escapeXml covers the five characters that matter", () => {
  assert.equal(escapeXml(`<&>"'`), "&lt;&amp;&gt;&quot;&apos;");
});
