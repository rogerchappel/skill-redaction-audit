# Release Candidate Notes

## Classification

Ship.

## Evidence

- Fixture-backed scanner covers secret, PII, side-effect, and clean examples.
- CLI supports Markdown and JSON output.
- Validation script runs check, test, smoke, and clean fixture scan.

## Verification Log

- `npm run validate` passed on 2026-06-24.
- `npm run check` passed.
- `npm test` passed with 2 tests.
- `npm run smoke` produced the expected failing redaction report for `fixtures/leaky-skill`.
- `node dist/src/cli.js scan fixtures/clean-skill --format json --fail-on error` passed with zero findings.

## Known Limits

- This is a focused public-skill audit, not a complete DLP scanner.
- It reports findings but does not rewrite content.
- Contextual false positives are expected around approval examples.
