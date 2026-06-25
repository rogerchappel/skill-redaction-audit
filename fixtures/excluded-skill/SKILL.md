# Excluded Fixture Skill

Use this fixture to prove generated directories can be skipped during release audits.

## Side-Effect Boundaries

This fixture is read-only and does not call external services.

## Approval Requirements

Approval is not required because the scan is local and read-only.

## Validation

Run the scanner with `--exclude generated` and confirm generated files are ignored.
