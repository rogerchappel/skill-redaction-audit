# skill-redaction-audit

`skill-redaction-audit` is a local-first CLI and reusable agent skill for checking public skill bundles before release. It looks for live-looking secrets, real-looking personal data, private workspace paths, and side-effect language that needs an approval boundary.

## Quickstart

```bash
npm install
npm run build
node dist/src/cli.js scan fixtures/leaky-skill --format markdown
```

## CLI

```bash
skill-redaction-audit scan ./skill-repo --format markdown
skill-redaction-audit scan ./skill-repo --format json --fail-on warning
skill-redaction-audit scan ./skill-repo --allowlist ./.redaction-allowlist.json
```

## Output

Findings include file, line, column, severity, rule id, message, and a suggested replacement. Markdown output is suitable for PR bodies; JSON output is suitable for automation. Excerpts redact matched secrets, personal data, and private paths so a report does not repeat the sensitive value it found.

## Skill Section Checks

When the target contains `SKILL.md`, the scanner also checks that the skill documents:

- side-effect boundaries
- approval requirements
- validation or verification steps

Missing sections are warnings because the bundle may still be useful internally, but they should be fixed before public release.

## Allowlist

Use an allowlist only for intentional fake examples.

```json
{
  "patterns": ["example.com", "sk_test_"],
  "files": ["fixtures/public-example.json"]
}
```

## Scoped Suppressions

For rare fixture lines that intentionally need to look like a blocked pattern, place a scoped suppression comment on the line immediately before the example:

```markdown
<!-- redaction-audit-ignore-next-line secret.openai-key -- deterministic fake token used by this scanner fixture -->
Use sk-1234567890abcdefghijklmnopqrstuvwxyz only as a scanner fixture.
```

Suppressions are counted in JSON and Markdown output as `suppressedFindings`. Keep the scope narrow, prefer a specific rule id over `*`, and do not use suppressions for unknown or live values.

## Limitations

This tool is not an enterprise DLP system. It is a focused pre-publication gate for agent-skill repos. It reports possible issues and leaves final review to the agent operator.

## Safety Notes

The CLI is read-only and does not call external services. Do not use it as approval to publish sensitive artifacts without human review of warnings and errors.
