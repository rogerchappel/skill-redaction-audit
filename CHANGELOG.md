# Changelog

## Unreleased

- Build the CLI during npm packaging and verify the installed tarball's help and
  scan threshold behavior from a clean source snapshot.
- Exclude compiled test files from published tarballs.

## 0.1.0

- Initial public CLI and skill package for local redaction audits of public
  skill bundles, with fixture-backed tests, smoke coverage, and release checks.
- Added markdown and JSON scan output for release-readiness review.
- Added allowlist, path exclusion, and scoped suppression support for
  deterministic fixtures.
