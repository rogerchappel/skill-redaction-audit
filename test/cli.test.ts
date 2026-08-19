import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

function scanSkill(path: string, ...args: string[]) {
  return spawnSync(process.execPath, ["dist/src/cli.js", "scan", path, "--format", "json", ...args], {
    encoding: "utf8"
  });
}

function runCli(...args: string[]) {
  return spawnSync(process.execPath, ["dist/src/cli.js", ...args], { encoding: "utf8" });
}

test("CLI prints help successfully when requested", () => {
  const result = spawnSync(process.execPath, ["dist/src/cli.js", "--help"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^Usage: skill-redaction-audit scan/);
  assert.equal(result.stderr, "");
});

test("CLI accepts a clean SKILL.md file target and emits successful JSON", () => {
  const result = scanSkill("fixtures/clean-skill/SKILL.md");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.filesScanned, 1);
  assert.equal(summary.maxSeverity, "none");
  assert.deepEqual(summary.findings, []);
});

test("CLI applies fail-on thresholds to an incomplete SKILL.md file target", () => {
  const defaultThreshold = scanSkill("fixtures/incomplete-skill/SKILL.md");
  assert.equal(defaultThreshold.status, 0, defaultThreshold.stderr);
  const summary = JSON.parse(defaultThreshold.stdout);
  assert.equal(summary.maxSeverity, "warning");
  assert.ok(!summary.findings.some((finding: { ruleId: string }) => finding.ruleId === "skill.missing"));

  const warningThreshold = scanSkill("fixtures/incomplete-skill/SKILL.md", "--fail-on", "warning");
  assert.equal(warningThreshold.status, 1, warningThreshold.stderr);
  assert.equal(JSON.parse(warningThreshold.stdout).maxSeverity, "warning");
});

test("CLI rejects unsupported options and extra positional arguments", () => {
  for (const [args, message] of [
    [["scan", "fixtures/clean-skill", "--unknown", "value"], "unknown option '--unknown'"],
    [["scan", "fixtures/clean-skill", "unexpected"], "unexpected argument 'unexpected'"]
  ] as const) {
    const result = runCli(...args);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, new RegExp(`^Error: ${message}`));
    assert.match(result.stderr, /\nUsage: skill-redaction-audit scan/);
  }
});

test("CLI rejects invalid enumerated option values", () => {
  for (const [flag, value, allowed] of [
    ["--format", "yaml", "json or markdown"],
    ["--fail-on", "fatal", "info, warning, or error"]
  ]) {
    const result = runCli("scan", "fixtures/clean-skill", flag, value);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, new RegExp(`^Error: invalid value '${value}' for ${flag}; expected ${allowed}`));
  }
});

test("CLI rejects every option that is missing its value", () => {
  for (const flag of ["--format", "--allowlist", "--exclude", "--fail-on"]) {
    for (const trailing of [[], ["--format", "json"]]) {
      const result = runCli("scan", "fixtures/clean-skill", flag, ...trailing);
      assert.equal(result.status, 2);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, new RegExp(`^Error: option ${flag} requires a value`));
    }
  }
});

test("CLI preserves documented option forms and repeated exclusions", () => {
  const markdown = runCli("scan", "fixtures/clean-skill", "--format", "markdown");
  assert.equal(markdown.status, 0, markdown.stderr);
  assert.match(markdown.stdout, /^# Skill Redaction Audit/);

  const configured = runCli(
    "scan",
    "fixtures/excluded-skill",
    "--format",
    "json",
    "--allowlist",
    "fixtures/allowlist.json",
    "--exclude",
    "generated",
    "--exclude",
    "coverage",
    "--fail-on",
    "warning"
  );
  assert.equal(configured.status, 0, configured.stderr);
  assert.equal(JSON.parse(configured.stdout).filesScanned, 1);
});

test("CLI rejects malformed allowlists without scanning", () => {
  const directory = mkdtempSync(join(tmpdir(), "redaction-allowlist-"));
  try {
    const invalidValues: Array<[string, unknown, string]> = [
      ["top-level string", "example.com", "expected a JSON object"],
      ["top-level null", null, "expected a JSON object"],
      ["string patterns", { patterns: "example.com" }, "'patterns' must be an array"],
      ["object files", { files: { name: "fixture.json" } }, "'files' must be an array"],
      ["non-string element", { patterns: ["example.com", 7] }, "'patterns\\[1\\]' must be a non-empty string"],
      ["blank element", { files: ["   "] }, "'files\\[0\\]' must be a non-empty string"]
    ];

    for (const [name, value, message] of invalidValues) {
      const allowlist = join(directory, `${name.replaceAll(" ", "-")}.json`);
      writeFileSync(allowlist, JSON.stringify(value));
      const result = scanSkill("fixtures/leaky-skill", "--allowlist", allowlist);
      assert.equal(result.status, 1, name);
      assert.equal(result.stdout, "", name);
      assert.match(result.stderr, new RegExp(`^Invalid allowlist: ${message}`), name);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
