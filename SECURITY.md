# Security Policy

## Supported Versions

This project is a v0.1.0 public CLI and skill package. Security fixes are made
on the default branch until a stable release line exists.

## Reporting a Vulnerability

Please report suspected vulnerabilities through GitHub private vulnerability
reporting when available, or by opening a minimal public issue that avoids
including live secrets, personal data, private paths, proprietary skill bundles,
or unpublished workspace contents.

Include the affected version or commit, a reproduction using synthetic fixtures,
and the expected impact. If a scanner finding exposes a real credential or
private value, redact it before sharing logs or screenshots.

## Data Handling

The CLI is intended for local pre-publication audits. It should read local skill
bundles, redact sensitive excerpts in reports, and avoid network calls or
external writes.
