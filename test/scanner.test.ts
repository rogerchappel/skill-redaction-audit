import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { scan } from "../src/scanner.js";
import { defaultAllowlist } from "../src/allowlist.js";

test("flags live-looking secrets and external action language", async () => {
  const summary = await scan({ root: resolve("fixtures/leaky-skill"), allowlist: defaultAllowlist() });
  assert.equal(summary.maxSeverity, "error");
  assert.ok(summary.findings.some((finding) => finding.ruleId === "secret.openai-key"));
  assert.ok(summary.findings.some((finding) => finding.ruleId === "side-effect.live-action"));
});

test("allows documented fake examples", async () => {
  const summary = await scan({ root: resolve("fixtures/clean-skill"), allowlist: defaultAllowlist() });
  assert.equal(summary.maxSeverity, "none");
  assert.equal(summary.findings.length, 0);
});

test("warns when skill safety sections are missing", async () => {
  const summary = await scan({ root: resolve("fixtures/incomplete-skill"), allowlist: defaultAllowlist() });
  assert.equal(summary.maxSeverity, "warning");
  assert.ok(summary.findings.some((finding) => finding.ruleId === "skill.section.side-effects"));
  assert.ok(summary.findings.some((finding) => finding.ruleId === "skill.section.approvals"));
  assert.ok(summary.findings.some((finding) => finding.ruleId === "skill.section.validation"));
});
