import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const temporaryRoot = mkdtempSync(join(tmpdir(), "skill-redaction-audit-package-"));
const source = join(temporaryRoot, "source");
const consumer = join(temporaryRoot, "consumer");

try {
  mkdirSync(source);
  mkdirSync(consumer);
  const archive = spawnSync("git", ["archive", "HEAD"], { cwd: root });
  assert.equal(archive.status, 0, archive.stderr.toString());
  const extract = spawnSync("tar", ["-x", "-C", source], { input: archive.stdout });
  assert.equal(extract.status, 0, extract.stderr.toString());

  execFileSync("npm", ["ci"], { cwd: source, stdio: "inherit" });
  const packOutput = execFileSync("npm", ["pack", "--json"], { cwd: source, encoding: "utf8" });
  const [packResult] = JSON.parse(packOutput);
  const shippedFiles = packResult.files.map(({ path }) => path);
  assert(shippedFiles.includes("dist/src/cli.js"), "tarball must contain the compiled CLI");
  assert(!shippedFiles.some((path) => path.startsWith("dist/test/")), "tarball must not contain compiled tests");

  execFileSync("npm", ["init", "--yes"], { cwd: consumer, stdio: "ignore" });
  execFileSync("npm", ["install", join(source, packResult.filename)], { cwd: consumer, stdio: "inherit" });
  const executable = join(consumer, "node_modules", ".bin", "skill-redaction-audit");
  const help = spawnSync(executable, ["--help"], { cwd: consumer, encoding: "utf8" });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /^Usage: skill-redaction-audit scan/);

  const installedPackage = join(consumer, "node_modules", "skill-redaction-audit");
  const scan = spawnSync(executable, ["scan", join(installedPackage, "fixtures", "incomplete-skill"), "--format", "json", "--fail-on", "warning"], { cwd: consumer, encoding: "utf8" });
  assert.equal(scan.status, 1, scan.stderr);
  assert.equal(JSON.parse(scan.stdout).maxSeverity, "warning");

  const malformedAllowlist = join(consumer, "invalid-allowlist.json");
  writeFileSync(malformedAllowlist, JSON.stringify({ patterns: "example.com", files: [] }));
  const rejected = spawnSync(executable, ["scan", join(installedPackage, "fixtures", "leaky-skill"), "--format", "json", "--allowlist", malformedAllowlist], { cwd: consumer, encoding: "utf8" });
  assert.equal(rejected.status, 1);
  assert.equal(rejected.stdout, "");
  assert.match(rejected.stderr, /^Invalid allowlist: 'patterns' must be an array of non-empty strings/);
  process.stdout.write(`Installed package smoke passed for ${packResult.filename}\n`);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
