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

since=$(date -u -d '7 days ago' +%F 2>/dev/null || date -u -v-7d +%F)
run_info=$(gh run list --repo iotaledger/iota --workflow=release.yml \
    --event=schedule --status=success --limit=20 --created ">=$since" \
    --json databaseId,createdAt \
    --jq 'sort_by(.createdAt) | last | "\(.databaseId) \(.createdAt)"')
run_id="${run_info% *}"
run_created="${run_info#* }"
if [[ -z "$run_id" || "$run_id" == "null" ]]; then
    echo "No successful scheduled nightly since $since" >&2
    exit 1
fi
echo "Using iotaledger/iota release.yml run $run_id (created $run_created)"

gh run download "$run_id" --repo iotaledger/iota \
    --pattern "iota-nightly-*-${os_type}" --dir .

tar -zxvf iota-nightly-*-"${os_type}"/*.tgz
chmod +x ./iota ./iota-localnet ./iota-indexer ./iota-graphql-rpc
echo "$(pwd)" >> "${GITHUB_PATH:-/dev/null}"
echo "IOTA nightly from run $run_id installed"

