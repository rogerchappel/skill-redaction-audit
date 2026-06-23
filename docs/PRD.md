# PRD: skill-redaction-audit

Status: in-progress
Decision: build now
Updated: 2026-06-24

## Pitch

A local-first audit skill and CLI that checks agent-skill bundles for sensitive content, unsafe live-action instructions, and missing redaction notes before public release.

## V1 Scope

- CLI: `skill-redaction-audit scan <path> --format json|markdown`.
- Scan Markdown, YAML, JSON, `.env.example`, fixtures, and release notes.
- Detect common secret patterns, personal data placeholders that look real, live external-action verbs, and missing redaction/safety sections.
- Include fixture-backed allowlist support for intentional examples such as `example.com`, `sk_test_*`, and fake tokens.
- Emit actionable diagnostics with file paths, line numbers, severity, and suggested replacement text.
- Include `SKILL.md` describing when agents should run the audit, side-effect boundaries, approval needs, examples, and validation.

## Out of Scope

- Cloud scanning, telemetry, or uploading artifacts.
- Comprehensive enterprise DLP.
- Rewriting files automatically in V1.
- Publishing packages or creating GitHub releases.
