import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { scan } from "../src/scanner.js";
import { defaultAllowlist } from "../src/allowlist.js";

test("flags live-looking secrets and external action language", async () => {
  const summary = await scan({ root: resolve("fixtures/leaky-skill"), allowlist: defaultAllowlist() });
  assert.equal(summary.maxSeverity, "error");
  assert.ok(summary.findings.some((finding) => finding.ruleId === "secret.openai-key"));
  assert.ok(summary.findings.some((finding) => finding.ruleId === "secret.bearer-token"));
  assert.ok(summary.findings.some((finding) => finding.ruleId === "side-effect.live-action"));
  assert.ok(summary.findings.some((finding) => finding.ruleId === "private.workspace-path"));
  assert.ok(summary.findings.some((finding) => finding.excerpt.includes("<REDACTED_SECRET>")));
  assert.ok(summary.findings.some((finding) => finding.excerpt.includes("<REDACTED_PII>")));
  assert.ok(summary.findings.some((finding) => finding.excerpt.includes("<REDACTED_PATH>")));
  assert.ok(!summary.findings.some((finding) => finding.excerpt.includes("sk-1234567890")));
  assert.ok(!summary.findings.some((finding) => finding.excerpt.includes("/Users/roger")));
  assert.equal(summary.severityCounts.error, 2);
  assert.equal(summary.severityCounts.warning, 6);
  assert.equal(summary.ruleCounts["secret.openai-key"], 1);
  assert.equal(summary.ruleCounts["secret.bearer-token"], 1);
  assert.equal(summary.ruleCounts["side-effect.live-action"], 1);
  assert.equal(summary.suppressedFindings, 0);
});

test("allows documented fake examples", async () => {
  const summary = await scan({ root: resolve("fixtures/clean-skill"), allowlist: defaultAllowlist() });
  assert.equal(summary.maxSeverity, "none");
  assert.equal(summary.findings.length, 0);
  assert.deepEqual(summary.severityCounts, { info: 0, warning: 0, error: 0 });
  assert.deepEqual(summary.ruleCounts, {});
  assert.equal(summary.suppressedFindings, 0);
});

test("recognizes a clean SKILL.md passed as the scan root", async () => {
  const summary = await scan({ root: resolve("fixtures/clean-skill/SKILL.md"), allowlist: defaultAllowlist() });
  assert.equal(summary.filesScanned, 1);
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

test("runs section checks against an incomplete SKILL.md passed as the scan root", async () => {
  const summary = await scan({ root: resolve("fixtures/incomplete-skill/SKILL.md"), allowlist: defaultAllowlist() });
  assert.equal(summary.filesScanned, 1);
  assert.equal(summary.maxSeverity, "warning");
  assert.ok(!summary.findings.some((finding) => finding.ruleId === "skill.missing"));
  assert.deepEqual(
    summary.findings.map((finding) => finding.ruleId).sort(),
    ["skill.section.approvals", "skill.section.side-effects", "skill.section.validation"]
  );
});

test("scans supported directory extensions without case sensitivity", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "redaction-extension-case-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await Promise.all([
    writeFile(join(root, "SKILL.MD"), "# Demo\n\nSide-effect boundaries require approval and verification.\n"),
    writeFile(join(root, "settings.JsOn"), '{"token":"sk-1234567890abcdefghijklmnopqrstuvwxyz"}\n'),
    writeFile(join(root, "policy.YaML"), "authorization: Bearer abcdefghijklmnopqrstuvwxyz123456\n"),
    writeFile(join(root, "ignored.js"), "const token = 'sk-1234567890abcdefghijklmnopqrstuvwxyz';\n")
  ]);

  const summary = await scan({ root, allowlist: defaultAllowlist() });

  assert.equal(summary.filesScanned, 3);
  assert.ok(summary.findings.some((finding) => finding.file === "settings.JsOn" && finding.ruleId === "secret.openai-key"));
  assert.ok(summary.findings.some((finding) => finding.file === "policy.YaML" && finding.ruleId === "secret.bearer-token"));
  assert.ok(!summary.findings.some((finding) => finding.file === "ignored.js"));
  assert.ok(!summary.findings.some((finding) => finding.ruleId === "skill.missing"));
});

test("honors scoped ignore-next-line comments for intentional examples", async () => {
  const summary = await scan({ root: resolve("fixtures/suppressed-skill"), allowlist: defaultAllowlist() });
  assert.equal(summary.maxSeverity, "none");
  assert.equal(summary.findings.length, 0);
  assert.equal(summary.suppressedFindings, 1);
});

test("skips caller-provided generated paths", async () => {
  const withoutExclude = await scan({ root: resolve("fixtures/excluded-skill"), allowlist: defaultAllowlist() });
  assert.equal(withoutExclude.maxSeverity, "error");
  assert.ok(withoutExclude.findings.some((finding) => finding.file === "generated/leaky.md"));

  const withExclude = await scan({ root: resolve("fixtures/excluded-skill"), allowlist: defaultAllowlist(), exclude: ["generated"] });
  assert.equal(withExclude.maxSeverity, "none");
  assert.equal(withExclude.findings.length, 0);
});
