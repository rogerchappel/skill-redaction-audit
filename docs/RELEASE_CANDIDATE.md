# Release Candidate Notes

## Classification

Ship.

## Evidence

- Fixture-backed scanner covers secret, PII, side-effect, and clean examples.
- CLI supports Markdown and JSON output.
- Validation script runs check, test, smoke, and clean fixture scan.

## Known Limits

- This is a focused public-skill audit, not a complete DLP scanner.
- It reports findings but does not rewrite content.
- Contextual false positives are expected around approval examples.
