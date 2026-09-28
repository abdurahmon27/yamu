#!/usr/bin/env node
/** yamu — fetch your Yandex Music data once, at build time, and keep it static. */
interface Args {
    command: string;
    flags: Map<string, string | boolean>;
    positionals: string[];
}
export declare function parseArgs(argv: string[]): Args;
export declare function main(argv: string[]): Promise<number>;
export {};
