# Orchestration

Run this audit before publishing an agent-skill repo or attaching generated examples to a release-candidate PR.

1. Run `skill-redaction-audit scan <repo> --format markdown`.
2. Review every `error` finding before pushing public branches.
3. Treat `warning` findings as approval-boundary review items.
4. Store intentional public examples in `.redaction-allowlist.json`.
5. Copy the Markdown report into the PR body when the repo is public-facing.

The CLI is read-only. It never rewrites files, uploads content, or calls external services.
