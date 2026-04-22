#!/bin/bash

# Clean and recreate the output directory
rm -rf generated-docs
mkdir -p generated-docs

packages="bcs dapp-kit graphql-transport isc-sdk kiosk ledgerjs-hw-app-iota names signers typescript wallet-standard"

for package in $packages; do
    # Generate typedoc for the package from its own directory
    cd "sdk/${package}" || exit
    pnpm exec typedoc \
        --options typedoc.json \
        --plugin typedoc-plugin-markdown \
        --readme none \
        --entryFileName index \
        --out "../../generated-docs/${package}" \
        --tsconfig tsconfig.json || exit
    cd - || exit
done
