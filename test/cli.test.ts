import assert from "node:assert/strict";
import { test } from "node:test";

import { parseArgs } from "../src/cli.js";

test("reads flags with values and flags without", () => {
  const args = parseArgs(["fetch", "--user", "me", "--likes", "--limit", "5"]);

  assert.equal(args.command, "fetch");
  assert.equal(args.flags.get("user"), "me");
  assert.equal(args.flags.get("likes"), true);
  assert.equal(args.flags.get("limit"), "5");
});

test("keeps positionals", () => {
  const args = parseArgs(["url", "https://music.yandex.uz/users/me/playlists/3"]);

  assert.equal(args.command, "url");
  assert.deepEqual(args.positionals, ["https://music.yandex.uz/users/me/playlists/3"]);
});

test("a trailing flag is still a flag", () => {
  const args = parseArgs(["fetch", "--playlists"]);
  assert.equal(args.flags.get("playlists"), true);
});

test("defaults to help", () => {
  assert.equal(parseArgs([]).command, "help");
});
