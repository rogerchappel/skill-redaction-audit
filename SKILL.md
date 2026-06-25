# Skill Redaction Audit

Use this skill before publishing or sharing an agent-skill bundle, generated skill fixture, release candidate, or public runbook.

## Required Inputs

- A local path to the skill repo or bundle.
- Optional `.redaction-allowlist.json` for intentional fake examples.
- Optional generated path prefixes to exclude from the source-bundle audit.

## Side-Effect Boundaries

This skill is read-only. It scans local files and produces a report. It must not rewrite files, upload artifacts, call external accounts, or approve publication.

## Approval Requirements

Ask the user before ignoring an `error` finding. Ask for explicit approval before publishing a repo that still has `warning` findings involving real-looking people, customer names, or live-action language.

Inline `redaction-audit-ignore-next-line` comments are allowed only for deterministic fake fixtures. Treat any suppressed finding count as a review item, and do not use suppressions for values copied from private workspaces or live accounts.

## Examples

```bash
skill-redaction-audit scan ./my-skill --format markdown
skill-redaction-audit scan ./my-skill --allowlist ./.redaction-allowlist.json --fail-on warning
skill-redaction-audit scan ./my-skill --exclude generated --exclude coverage
```

## Validation

Run `npm run validate`. Attach the audit summary to release-candidate PRs for public skill repos.
