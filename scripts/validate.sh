#!/usr/bin/env bash
set -euo pipefail

npm run check
npm test
npm run smoke
node dist/src/cli.js scan fixtures/clean-skill --format json --fail-on error
test -s LICENSE
test -s SECURITY.md
test -s CHANGELOG.md
