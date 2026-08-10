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
  exclude: string[];
  failOn: Severity;
}

type ParseResult = { options: CliOptions } | { error: string };

async function main(argv: string[]): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp(process.stdout);
    return 0;
  }

  const parsed = parseArgs(argv);
  if ("error" in parsed) {
    process.stderr.write(`Error: ${parsed.error}\n`);
    printHelp(process.stderr);
    return 2;
  }

  const { options } = parsed;
  if (options.command !== "scan" || !options.path) {
    printHelp(process.stderr);
    return 2;
  }

  const allowlist = await loadAllowlist(options.allowlist ? resolve(options.allowlist) : undefined);
  const summary = await scan({ root: resolve(options.path), allowlist, exclude: options.exclude });
  process.stdout.write(options.format === "json" ? formatJson(summary) : formatMarkdown(summary));
  return shouldFail(summary.maxSeverity, options.failOn) ? 1 : 0;
}

function parseArgs(argv: string[]): ParseResult {
  const options: CliOptions = { command: argv[0], path: argv[1], format: "markdown", exclude: [], failOn: "error" };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--format") {
      if (!hasOptionValue(next)) return { error: "option --format requires a value" };
      if (next !== "json" && next !== "markdown") {
        return { error: `invalid value '${next}' for --format; expected json or markdown` };
      }
      options.format = next;
      index += 1;
    } else if (arg === "--allowlist") {
      if (!hasOptionValue(next)) return { error: "option --allowlist requires a value" };
      options.allowlist = next;
      index += 1;
    } else if (arg === "--exclude") {
      if (!hasOptionValue(next)) return { error: "option --exclude requires a value" };
      options.exclude.push(next);
      index += 1;
    } else if (arg === "--fail-on") {
      if (!hasOptionValue(next)) return { error: "option --fail-on requires a value" };
      if (!isSeverity(next)) {
        return { error: `invalid value '${next}' for --fail-on; expected info, warning, or error` };
      }
      options.failOn = next;
      index += 1;
    } else if (arg.startsWith("-")) {
      return { error: `unknown option '${arg}'` };
    } else {
      return { error: `unexpected argument '${arg}'` };
    }
  }
  return { options };
}

function hasOptionValue(value: string | undefined): value is string {
  return value !== undefined && !value.startsWith("-");
}

function isSeverity(value: string | undefined): value is Severity {
  return value === "info" || value === "warning" || value === "error";
}

function shouldFail(maxSeverity: Severity | "none", failOn: Severity): boolean {
  const rank = { none: 0, info: 1, warning: 2, error: 3 };
  return rank[maxSeverity] >= rank[failOn];
}

function printHelp(output: NodeJS.WritableStream): void {
  output.write(`Usage: skill-redaction-audit scan <path> [--format json|markdown] [--allowlist file] [--exclude path-prefix] [--fail-on info|warning|error]\n`);
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
