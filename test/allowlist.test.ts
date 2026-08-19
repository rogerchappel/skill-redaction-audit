import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { defaultAllowlist, loadAllowlist } from "../src/allowlist.js";

test("documented allowlist arrays merge with built-in safe examples", async () => {
  const directory = await mkdtemp(join(tmpdir(), "redaction-allowlist-"));
  const path = join(directory, "allowlist.json");
  try {
    await writeFile(path, JSON.stringify({
      patterns: ["example.com", "sk_test_"],
      files: ["fixtures/public-example.json"]
    }));
    const loaded = await loadAllowlist(path);
    assert.deepEqual(loaded.patterns, [...defaultAllowlist().patterns, "example.com", "sk_test_"]);
    assert.deepEqual(loaded.files, ["fixtures/public-example.json"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
