#!/usr/bin/env node
import { resolve } from "node:path";
import { loadAllowlist } from "./allowlist.js";
import { formatJson, formatMarkdown } from "./format.js";
import { scan } from "./scanner.js";
import type { Severity } from "./types.js";

interface CliOptions {
  command?: string;
  path?: string;
  format: "json" | "markdown";
  allowlist?: string;
  failOn: Severity;
}

async function main(argv: string[]): Promise<number> {
  const options = parseArgs(argv);
  if (options.command !== "scan" || !options.path) {
    printHelp();
    return 2;
  }

  const allowlist = await loadAllowlist(options.allowlist ? resolve(options.allowlist) : undefined);
  const summary = await scan({ root: resolve(options.path), allowlist });
  process.stdout.write(options.format === "json" ? formatJson(summary) : formatMarkdown(summary));
  return shouldFail(summary.maxSeverity, options.failOn) ? 1 : 0;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { command: argv[0], path: argv[1], format: "markdown", failOn: "error" };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--format" && (next === "json" || next === "markdown")) {
      options.format = next;
      index += 1;
    } else if (arg === "--allowlist" && next) {
      options.allowlist = next;
      index += 1;
    } else if (arg === "--fail-on" && isSeverity(next)) {
      options.failOn = next;
      index += 1;
    }
  }
  return options;
}

function isSeverity(value: string | undefined): value is Severity {
  return value === "info" || value === "warning" || value === "error";
}

function shouldFail(maxSeverity: Severity | "none", failOn: Severity): boolean {
  const rank = { none: 0, info: 1, warning: 2, error: 3 };
  return rank[maxSeverity] >= rank[failOn];
}

function printHelp(): void {
  process.stderr.write(`Usage: skill-redaction-audit scan <path> [--format json|markdown] [--allowlist file] [--fail-on info|warning|error]\n`);
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
