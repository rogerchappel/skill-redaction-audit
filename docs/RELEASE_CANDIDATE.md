# Release Candidate Notes

## Classification

Ship.

## Evidence

- Fixture-backed scanner covers secret, PII, side-effect, and clean examples.
- Private workspace path detection catches local home-directory references before public release.
- Finding excerpts redact matched secrets, personal data, and local paths before rendering.
- SKILL.md section checks warn when side-effect boundaries, approvals, or validation guidance are missing.
- Scoped `redaction-audit-ignore-next-line` comments suppress intentional fixture examples while counting suppressed findings in the report.
- Caller-provided `--exclude` path prefixes skip generated artifacts without weakening scans for source skill files.
- GitHub Actions CI runs check, test, smoke, and validation on `main`, release-candidate branches, and PRs.
- CLI supports Markdown and JSON output.
- Validation script runs check, test, smoke, and clean fixture scan.

## Verification Log

- `npm run validate` passed on 2026-06-25.
- `npm run check` passed on 2026-06-25.
- `npm run build` passed on 2026-06-25.
- `npm test` passed with 5 tests on 2026-06-25.
- `npm run smoke` produced the expected failing redaction report for `fixtures/leaky-skill`.
- `node dist/src/cli.js scan fixtures/clean-skill --format json --fail-on error` passed with zero findings.
- `node dist/src/cli.js scan fixtures/excluded-skill --exclude generated --format json --fail-on warning` passed with zero findings.

## Known Limits

- This is a focused public-skill audit, not a complete DLP scanner.
- It reports findings but does not rewrite content.
- Exclusions are simple relative path prefixes; review them carefully before using them in CI.
- Suppression comments are intended only for deterministic fake fixtures and still require review.
- Contextual false positives are expected around approval examples.
- Missing safety sections are warnings so operators can decide whether an internal bundle needs public-release polish.
