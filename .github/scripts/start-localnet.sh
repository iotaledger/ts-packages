#!/bin/bash
set -euo pipefail

# ============================================================================
# SDK / GraphQL / Kiosk E2E localnet
# Two-step start (genesis then start) so the fullnode config can be edited
# before booting. Assumes iota-localnet is already in PATH.
#
# Balance/object-change reads (showBalanceChanges/showObjectChanges) resolve the
# input objects at their pre-transaction versions. The default fullnode config
# prunes those immediately (num-epochs-to-retain: 0), so reads referencing a
# superseded object fail with ObjectNotFound. Retain all epochs instead.
# ============================================================================

WORKDIR="$(mktemp -d)"

iota-localnet genesis --with-faucet --working-dir "$WORKDIR" --epoch-duration-ms 120000

sed -i 's/^\( *num-epochs-to-retain:\) 0$/\1 18446744073709551615/' "$WORKDIR/fullnode.yaml"
grep -q 'num-epochs-to-retain: 18446744073709551615' "$WORKDIR/fullnode.yaml" || {
    echo "ERROR: could not disable fullnode pruning in $WORKDIR/fullnode.yaml" >&2
    exit 1
}

exec iota-localnet start --with-faucet --with-indexer --with-graphql --network.config "$WORKDIR"
