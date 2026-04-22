#!/bin/bash
set -euo pipefail

# Downloads the latest nightly IOTA binaries from iotaledger/iota's release.yml
# workflow (scheduled build, cut from develop).

os_name=$(uname -s | tr '[:upper:]' '[:lower:]')
arch_name=$(uname -m)
[[ "$os_name" == "darwin" ]] && os_name="macos"
[[ "$arch_name" == "aarch64" ]] && arch_name="arm64"
os_type="${os_name}-${arch_name}"

run_id=$(gh run list --repo iotaledger/iota --workflow=release.yml \
    --status=success --limit=20 \
    --json databaseId,event \
    --jq '[.[] | select(.event == "schedule")] | .[0].databaseId')

gh run download "$run_id" --repo iotaledger/iota \
    --pattern "iota-nightly-*-${os_type}" --dir .

tar -zxvf iota-nightly-*-"${os_type}"/*.tgz
chmod +x ./iota ./iota-localnet ./iota-indexer ./iota-graphql-rpc
echo "$(pwd)" >> "$GITHUB_PATH"
