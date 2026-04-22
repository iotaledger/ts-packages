#!/bin/bash
set -euo pipefail

# Downloads the latest nightly IOTA binaries from iotaledger/iota's release.yml
# workflow (scheduled build, cut from develop).

os_name=$(uname -s | tr '[:upper:]' '[:lower:]')
arch_name=$(uname -m)
[[ "$os_name" == "darwin" ]] && os_name="macos"
[[ "$arch_name" == "aarch64" ]] && arch_name="arm64"
os_type="${os_name}-${arch_name}"

gh --version

run_info=$(gh run list --repo iotaledger/iota --workflow=release.yml \
    --limit=20 \
    --json databaseId,event,conclusion,createdAt \
    --jq '[.[] | select(.event == "schedule" and .conclusion == "success")] | .[0] | "\(.databaseId) \(.createdAt)"')
run_id="${run_info% *}"
run_created="${run_info#* }"
echo "Using iotaledger/iota release.yml run $run_id (created $run_created)"

gh run download "$run_id" --repo iotaledger/iota \
    --pattern "iota-nightly-*-${os_type}" --dir .

tar -zxvf iota-nightly-*-"${os_type}"/*.tgz
chmod +x ./iota ./iota-localnet ./iota-indexer ./iota-graphql-rpc
echo "$(pwd)" >> "${GITHUB_PATH:-/dev/null}"
echo "IOTA nightly from run $run_id installed"

