# IOTA TypeScript Monorepo

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D10-orange?logo=pnpm)](https://pnpm.io/)
[![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen?logo=node.js)](https://nodejs.org/)

[Website](https://iota.org) | [Documentation](https://docs.iota.org) | [Explorer](https://explorer.iota.org) | [Discord](https://discord.iota.org/)

TypeScript SDKs, React tooling, end-user apps, and example dApps for the IOTA ecosystem.

### Getting Started

```bash
git clone --recurse-submodules https://github.com/iotaledger/ts-packages
cd ts-packages
pnpm install
```

### SDKs

| Package | Description |
| --- | --- |
| [`@iota/iota-sdk`](./sdk/typescript) | Core SDK for reading state, building and signing transactions. |
| [`@iota/dapp-kit`](./sdk/dapp-kit) | React hooks, components, and providers for dApps. |
| [`@iota/create-dapp`](./sdk/create-dapp) | CLI scaffold for a new React + Vite dApp. |
| [`@iota/apps-ui-kit`](./apps/ui-kit) | Shared React component library. |
| [`@iota/apps-ui-icons`](./apps/ui-icons) | Shared icon set as React components. |
| [`@iota/bcs`](./sdk/bcs) | Binary Canonical Serialization implementation. |
| [`@iota/wallet-standard`](./sdk/wallet-standard) | Wallet Standard implementation for IOTA. |
| [`@iota/signers`](./sdk/signers) | Unified signer interface (local, KMS, WebCrypto, Ledger). |
| [`@iota/kiosk`](./sdk/kiosk) | SDK for the Kiosk marketplace primitive. |
| [`@iota/iota-names-sdk`](./sdk/names) | Resolve and register IOTA Names. |
| [`@iota/isc-sdk`](./sdk/isc-sdk) | SDK for IOTA Smart Contracts (ISC). |
| [`@iota/graphql-transport`](./sdk/graphql-transport) | GraphQL transport for `IotaClient` (RPC 2.0). |
| [`@iota/ledgerjs-hw-app-iota`](./sdk/ledgerjs-hw-app-iota) | Bindings for the IOTA Ledger hardware wallet app. |

### Apps

| App | Description |
| --- | --- |
| [Explorer](./apps/explorer) | Network explorer for transactions, objects, and validators. |
| [Wallet](./apps/wallet) | Chrome extension wallet for IOTA. |
| [Wallet Dashboard](./apps/wallet-dashboard) | Web dashboard for assets, staking, and governance. |
| [EVM Bridge](./apps/evm-bridge) | UI for bridging assets between IOTA and EVM chains. |
| [Names dApp](./apps/names) | Frontend for the IOTA Names Service. |

### Common Commands

```bash
pnpm wallet dev          # Run a single workspace command
pnpm lint                # eslint + prettier
pnpm test                # Run all test suites via turbo
```

Per-app aliases (`pnpm explorer-dev`, `pnpm wallet-dev`, …) are defined in [`package.json`](./package.json).

### Contributing

Run `pnpm lint` and `pnpm test` before opening a PR. For changes to published packages, add a changeset with `pnpm changeset`.

### License

[Apache License 2.0](./LICENSE)
