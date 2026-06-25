# Suppressed Skill

Use this fixture when the audit needs to prove scoped suppression behavior for a documented fake secret.

## Side Effects

This skill reads local examples only. It does not send messages, publish content, or write to external systems.

## Approval

Ask for approval before any external action.

## Validation

Run the scanner and verify the report counts the intentional suppression without reporting a finding.

## Example

<!-- redaction-audit-ignore-next-line secret.openai-key -- deterministic fake token used to test suppression counting -->
Use sk-1234567890abcdefghijklmnopqrstuvwxyz only as a scanner fixture.
