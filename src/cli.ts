#!/usr/bin/env node
/** yamu — fetch your Yandex Music data once, at build time, and keep it static. */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

import { YamuError } from "./api.js";
import { coverDataUri, renderCard, THEMES, type ThemeName } from "./card.js";
import { collect } from "./fetch.js";
import { looksLikeUuid, parsePlaylistUrl } from "./url.js";
import type { Tld, YamuData } from "./types.js";

const HELP = `yamu — Yandex Music data for your portfolio

Usage
  yamu fetch --user <uid|login> [options]
  yamu card  --in <data.json> --out <card.svg> [options]
  yamu url   <music.yandex link>

fetch
  --playlist <url|uuid|kind>
                         The playlist link Yandex Music gives you. A uuid link
                         carries the owner, so nothing else is needed.
  --user <uid|login>     Only for --likes / --playlists without a playlist
                         link, or for an old-style numeric kind.
  --playlists            Include the user's public playlist list.
  --likes                Include liked tracks (profile music must be public).
  --limit <n>            Keep at most n tracks per section. Default 20.
  --tld <ru|uz|com|by|kz> Yandex Music domain. Default ru.
  --lang <code>          Language for localised titles. Default en.
  --token <token>        Yandex OAuth token. Only needed for private data.
  --out <file>           Where to write the JSON. Default yamu.json
  --card <file>          Also render an SVG card to this path.
  --theme <name>         gruvbox | dark | light | nord. Default gruvbox.
  --cover                Embed the playlist cover in the card.
  --soft-fail            On a failed fetch, keep the existing files and exit 0.

card
  --in <file>            JSON written by yamu fetch.
  --out <file>           SVG destination.
  --theme <name>         gruvbox | dark | light | nord.
  --limit <n>            Tracks to draw. Default 5.
  --title <text>         Override the heading.
  --width <px>           Card width. Default 460.
  --no-footer            Hide the "updated …" line.

Examples
  yamu fetch --user yamusic-top --playlist 1076 --tld uz --out public/music.json
  yamu fetch --playlist https://music.yandex.com/playlists/lk.1234abcd-… --card card.svg
  yamu fetch --playlist https://music.yandex.uz/users/me/playlists/1000 --card card.svg
  yamu card --in public/music.json --out public/music.svg --theme dark --limit 8
`;

interface Args {
  command: string;
  flags: Map<string, string | boolean>;
  positionals: string[];
}

export function parseArgs(argv: string[]): Args {
  const [command = "help", ...rest] = argv;
  const flags = new Map<string, string | boolean>();
  const positionals: string[] = [];

  for (let index = 0; index < rest.length; index++) {
    const token = rest[index]!;
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const name = token.slice(2);
    const next = rest[index + 1];
    if (next === undefined || next.startsWith("--")) {
      flags.set(name, true);
    } else {
      flags.set(name, next);
      index++;
    }
  }
  return { command, flags, positionals };
}

function stringFlag(args: Args, name: string): string | undefined {
  const value = args.flags.get(name);
  return typeof value === "string" ? value : undefined;
}

function boolFlag(args: Args, name: string): boolean {
  return args.flags.get(name) === true || args.flags.get(name) === "true";
}

function numberFlag(args: Args, name: string, fallback: number): number {
  const value = stringFlag(args, name);
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function themeFlag(args: Args): ThemeName {
  const value = stringFlag(args, "theme");
  return value && value in THEMES ? (value as ThemeName) : "gruvbox";
}

async function writeOut(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
}

async function runFetch(args: Args): Promise<number> {
  const out = stringFlag(args, "out") ?? "yamu.json";
  const cardPath = stringFlag(args, "card");
  const softFail = boolFlag(args, "soft-fail");

  let user = stringFlag(args, "user");
  let playlist = stringFlag(args, "playlist");
  let playlistUuid: string | undefined;
  let tld = (stringFlag(args, "tld") ?? "ru") as Tld;

  // A playlist link carries everything: the domain, and either the owner and
  // the kind, or a uuid that stands on its own.
  if (playlist && playlist.includes("music.yandex")) {
    const parsed = parsePlaylistUrl(playlist);
    if (!parsed) {
      console.error("yamu: could not read that playlist URL");
      return 1;
    }
    if (!stringFlag(args, "tld")) tld = parsed.tld;
    if (parsed.kind === "playlist-uuid") {
      playlistUuid = parsed.uuid;
      playlist = undefined;
    } else {
      user = user ?? parsed.user;
      playlist = parsed.playlistKind;
    }
  } else if (playlist && looksLikeUuid(playlist)) {
    playlistUuid = playlist;
    playlist = undefined;
  }

  if (!user && !playlistUuid && !playlist) {
    console.error("yamu: pass a playlist link, or --user with what you want");
    return 1;
  }
  if (!playlist && !playlistUuid && !boolFlag(args, "likes") && !boolFlag(args, "playlists")) {
    console.error("yamu: nothing to fetch — pass --playlist, --likes or --playlists");
    return 1;
  }

  try {
    const data = await collect({
      ...(user ? { user } : {}),
      ...(playlist ? { playlist } : {}),
      ...(playlistUuid ? { playlistUuid } : {}),
      playlists: boolFlag(args, "playlists"),
      likes: boolFlag(args, "likes"),
      limit: numberFlag(args, "limit", 20),
      tld,
      ...(stringFlag(args, "token") ? { token: stringFlag(args, "token")! } : {}),
      ...(stringFlag(args, "lang") ? { lang: stringFlag(args, "lang")! } : {}),
    });

    await writeOut(out, `${JSON.stringify(data, null, 2)}\n`);
    console.log(`yamu: wrote ${out}`);

    if (cardPath) {
      await writeCard(data, cardPath, args);
      console.log(`yamu: wrote ${cardPath}`);
    }
    return 0;
  } catch (error) {
    const message = error instanceof YamuError ? `${error.message} (${error.endpoint})` : String(error);
    if (softFail) {
      console.warn(`yamu: fetch failed, keeping existing files — ${message}`);
      return 0;
    }
    console.error(`yamu: ${message}`);
    return 1;
  }
}

async function writeCard(data: YamuData, path: string, args: Args): Promise<void> {
  const embedCover = boolFlag(args, "cover");
  const cover = embedCover ? await coverDataUri(data.playlist?.cover ?? null) : null;
  if (embedCover && !cover) {
    console.warn("yamu: could not embed the cover — drawing the card without it");
  }

  const svg = renderCard(data, {
    theme: themeFlag(args),
    limit: numberFlag(args, "limit", 5),
    width: numberFlag(args, "width", 460),
    ...(stringFlag(args, "title") ? { title: stringFlag(args, "title")! } : {}),
    ...(cover ? { coverDataUri: cover } : {}),
    hideFooter: boolFlag(args, "no-footer"),
  });
  await writeOut(path, `${svg}\n`);
}

async function runCard(args: Args): Promise<number> {
  const input = stringFlag(args, "in");
  const out = stringFlag(args, "out");
  if (!input || !out) {
    console.error("yamu: card needs --in <data.json> and --out <card.svg>");
    return 1;
  }
  if (!existsSync(input)) {
    console.error(`yamu: ${input} does not exist — run yamu fetch first`);
    return 1;
  }

  const data = JSON.parse(await readFile(input, "utf8")) as YamuData;
  await writeCard(data, out, args);
  console.log(`yamu: wrote ${out}`);
  return 0;
}

function runUrl(args: Args): number {
  const input = args.positionals[0];
  if (!input) {
    console.error("yamu: url needs a link, e.g. yamu url https://music.yandex.uz/users/me/playlists/1000");
    return 1;
  }
  const parsed = parsePlaylistUrl(input);
  if (!parsed) {
    console.error("yamu: that is not a playlist link");
    return 1;
  }
  const described =
    parsed.kind === "playlist-uuid"
      ? { playlist: parsed.uuid, tld: parsed.tld }
      : { user: parsed.user, playlist: parsed.playlistKind, tld: parsed.tld };
  console.log(JSON.stringify(described, null, 2));
  return 0;
}

export async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  switch (args.command) {
    case "fetch":
      return runFetch(args);
    case "card":
      return runCard(args);
    case "url":
      return runUrl(args);
    case "--version":
    case "version":
      console.log("0.1.0");
      return 0;
    default:
      console.log(HELP);
      return args.command === "help" || args.command === "--help" ? 0 : 1;
  }
}

const isDirectRun = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
