#!/bin/bash
# This script is meant to be run from the "Ignored Build Step" in Vercel.

PACKAGE_NAME="$(pnpm pkg get name | tr -d '"')"

echo "--- git state ---"
echo "HEAD:    $(git rev-parse HEAD 2>&1)"
echo "HEAD^1:  $(git rev-parse HEAD^1 2>&1)"
git log --oneline -5 2>&1 || true
echo "--- changed files (HEAD^1..HEAD) ---"
git diff --name-only HEAD^1 HEAD 2>&1 || true
echo "--- .turbo state ---"
ls -la ../../.turbo 2>/dev/null || echo "no root .turbo"
ls -la .turbo 2>/dev/null || echo "no local .turbo"
echo "--- turbo query ---"

pnpx turbo query affected --packages "$PACKAGE_NAME" --base=HEAD^1 --exit-code
