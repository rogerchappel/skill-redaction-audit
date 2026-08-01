import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

function scanSkill(path: string, ...args: string[]) {
  return spawnSync(process.execPath, ["dist/src/cli.js", "scan", path, "--format", "json", ...args], {
    encoding: "utf8"
  });
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
