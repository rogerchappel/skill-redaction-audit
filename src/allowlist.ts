import { readFile } from "node:fs/promises";
import type { Allowlist } from "./types.js";

export async function loadAllowlist(path?: string): Promise<Allowlist> {
  if (!path) {
    return defaultAllowlist();
  }

  const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
  assertAllowlist(parsed);
  return {
    patterns: [...defaultAllowlist().patterns, ...(parsed.patterns ?? [])],
    files: [...defaultAllowlist().files, ...(parsed.files ?? [])]
  };
}

function assertAllowlist(value: unknown): asserts value is Partial<Allowlist> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Invalid allowlist: expected a JSON object");
  }

  for (const field of ["patterns", "files"] as const) {
    const entries = (value as Record<string, unknown>)[field];
    if (entries === undefined) continue;
    if (!Array.isArray(entries)) {
      throw new Error(`Invalid allowlist: '${field}' must be an array of non-empty strings`);
    }
    const invalidIndex = entries.findIndex((entry) => typeof entry !== "string" || entry.trim().length === 0);
    if (invalidIndex !== -1) {
      throw new Error(`Invalid allowlist: '${field}[${invalidIndex}]' must be a non-empty string`);
    }
  }
}

export function defaultAllowlist(): Allowlist {
  return {
    patterns: [
      "example.com",
      "user@example.com",
      "sk_test_",
      "xoxb-example",
      "00000000-0000-0000-0000-000000000000"
    ],
    files: []
  };
}

export function isAllowed(value: string, relativeFile: string, allowlist: Allowlist): boolean {
  if (allowlist.files.some((file) => relativeFile === file || relativeFile.endsWith(`/${file}`))) {
    return true;
  }

  return allowlist.patterns.some((pattern) => value.includes(pattern));
}
