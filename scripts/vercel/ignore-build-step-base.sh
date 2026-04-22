#!/bin/bash
# This script is meant to be run from the "Ignored Build Step" in Vercel.

PACKAGE_NAME="$(node -p "require('./package.json').name")"

echo "Package:       $PACKAGE_NAME"
echo "HEAD:          $(git rev-parse HEAD)"
echo "HEAD^1:        $(git rev-parse HEAD^1)"
echo "Changed files:"
git diff --name-only HEAD^1 HEAD | sed 's/^/  /'

pnpx turbo query affected --packages "$PACKAGE_NAME" --base=HEAD^1 --exit-code
