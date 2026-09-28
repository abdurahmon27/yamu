/**
 * GitHub Action entry point.
 *
 * Reads the action inputs, writes the JSON (and optionally the SVG), and never
 * fails the workflow over a bad day at Yandex: with `soft-fail` on, the files
 * you already committed stay exactly as they are.
 */
import { appendFile } from "node:fs/promises";
import { main } from "./cli.js";
function input(name) {
    const value = process.env[`INPUT_${name.toUpperCase().replace(/ /g, "_")}`];
    return value && value.length > 0 ? value : undefined;
}
function flag(name) {
    return (input(name) ?? "false").toLowerCase() === "true";
}
async function setOutput(name, value) {
    const file = process.env["GITHUB_OUTPUT"];
    if (!file)
        return;
    await appendFile(file, `${name}=${value}\n`, "utf8");
}
function buildArgv() {
    const argv = ["fetch"];
    const push = (name, value) => {
        if (value !== undefined)
            argv.push(`--${name}`, value);
    };
    push("user", input("user"));
    push("playlist", input("playlist"));
    push("tld", input("tld"));
    push("lang", input("lang"));
    push("api-base", input("api-base"));
    push("api-key", input("api-key"));
    push("limit", input("limit"));
    push("out", input("out") ?? "yamu.json");
    push("token", input("token"));
    push("card", input("card"));
    push("theme", input("theme"));
    push("title", input("title"));
    push("width", input("width"));
    if (flag("likes"))
        argv.push("--likes");
    if (flag("playlists"))
        argv.push("--playlists");
    if (flag("cover"))
        argv.push("--cover");
    if (input("soft-fail") === undefined || flag("soft-fail"))
        argv.push("--soft-fail");
    return argv;
}
const code = await main(buildArgv());
await setOutput("json", input("out") ?? "yamu.json");
if (input("card"))
    await setOutput("card", input("card"));
if (code !== 0) {
    console.log("::error::yamu failed — see the log above");
    process.exitCode = code;
}
