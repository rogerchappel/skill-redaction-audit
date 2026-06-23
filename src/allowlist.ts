import { readFile } from "node:fs/promises";
import type { Allowlist } from "./types.js";

export async function loadAllowlist(path?: string): Promise<Allowlist> {
  if (!path) {
    return defaultAllowlist();
  }

  const parsed = JSON.parse(await readFile(path, "utf8")) as Partial<Allowlist>;
  return {
    patterns: [...defaultAllowlist().patterns, ...(parsed.patterns ?? [])],
    files: [...defaultAllowlist().files, ...(parsed.files ?? [])]
  };
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
