# `@iota/grpc`

`@iota/grpc` is part of the **IOTA Rebased SDK**, designed specifically for interacting with the
IOTA Rebased protocol.

This package provides `IotaGrpcClient`, a client for the gRPC API of IOTA full nodes. It reads
objects, transactions, checkpoints and epochs, lists owned objects, coins, dynamic fields and
package versions, streams checkpoints as they are produced, and simulates and executes
transactions.

It runs on Node, Bun and Deno. Browsers are not supported yet: see [Limitations](#limitations).

## Install

```bash
npm install --save @iota/grpc @iota/iota-sdk
```

## Setup

```ts
import { IotaGrpcClient } from '@iota/grpc';

// One of 'mainnet', 'testnet', 'devnet' or 'localnet'.
const client = new IotaGrpcClient({ network: 'testnet' });
```

Pass `url` instead of `network` to use another node, or `transport` to use your own Connect
transport:

```ts
const client = new IotaGrpcClient({ url: 'https://grpc.testnet.iota.cafe' });
```

Large responses are split into several messages. `maxMessageSizeBytes` sets how large each one
may be, between 1 MB and 128 MB. The default is 4 MB.

## Responses

Every method returns the response as `body`, together with the `metadata` the node sends with
it: the chain, the epoch, the checkpoint height, the lowest checkpoint it still serves, and its
version.

```ts
const { body: epoch, metadata } = await client.getEpoch();

console.log(epoch.epoch, epoch.referenceGasPrice);
console.log(metadata.chain, metadata.checkpointHeight);
```

Every method also takes a `signal`, to cancel the call with an `AbortSignal`.

## Reading objects, transactions and checkpoints

`getObjects` and `getTransactions` take several IDs or digests and answer with one result per
item, in the order asked. An item the node does not have fails only its own slot, so check `ok`
on each:

```ts
import { decodeObject, objectIdOf } from '@iota/grpc';

const { body } = await client.getObjects(['0x5', '0x6']);

for (const result of body) {
    if (!result.ok) {
        console.error(result.error.message);
        continue;
    }
    console.log(objectIdOf(decodeObject(result.value)));
}
```

Objects, transactions, effects, events and checkpoints come back as BCS. Decode them with
`decodeObject`, `decodeTransaction`, `decodeTransactionEffects`, `decodeTransactionEvents` and
`decodeCheckpointSummary`.

`getCheckpoint` returns the latest checkpoint, or the one with the given sequence number or
digest. By default only its summary is filled in: ask for its transactions and events with
`readMask` (see below).

```ts
const { body: latest } = await client.getCheckpoint();
const { body: previous } = await client.getCheckpoint({
    sequenceNumber: latest.sequenceNumber - 1n,
});
```

## Read masks

A read mask chooses which fields the node fills in. Each method has a default, listed in
`DEFAULT_READ_MASKS`. Pass `readMask` to ask for other fields, using the constants for that
method:

```ts
import { TransactionField } from '@iota/grpc';

const { body } = await client.getTransactions([digest], {
    readMask: [TransactionField.EFFECTS, TransactionField.CHECKPOINT],
});
```

A single field works too: `readMask: TransactionField.EFFECTS`. An empty list asks for nothing,
so every field comes back unset.

## Owned objects, coins and dynamic fields

The list methods return one page and the token for the next. Their `listAll` counterparts follow
the tokens for you, up to `limit` items:

```ts
// One page of the coins an address owns, decoded.
const { body: page } = await client.listCoins(owner, { pageSize: 50 });
console.log(page.items, page.nextPageToken);

// Up to 500 IOTA coins, across as many pages as that takes.
const { body: coins } = await client.listAllCoins(owner, {
    coinType: '0x2::iota::IOTA',
    limit: 500,
});
const total = coins.reduce((sum, coin) => sum + coin.balance, 0n);
```

| Method                                         | Lists                                                       |
| ---------------------------------------------- | ----------------------------------------------------------- |
| `listOwnedObjects` / `listAllOwnedObjects`     | Objects an address owns, optionally only of an `objectType` |
| `listCoins` / `listAllCoins`                   | Coins an address owns, decoded, optionally of a `coinType`  |
| `listDynamicFields` / `listAllDynamicFields`   | Dynamic fields of a parent object                           |
| `listPackageVersions` / `listAllPackageVersions` | Every version of a Move package, oldest first             |

`getCoinInfo` returns the metadata, treasury and regulation info of a coin type:

```ts
const { body } = await client.getCoinInfo('0x2::iota::IOTA');
console.log(body.metadata?.symbol, body.metadata?.decimals);
```

## Simulating and executing transactions

Build and sign transactions with `@iota/iota-sdk` as usual, then pass the bytes and signatures:

```ts
import { getRpcUrl, IotaClient } from '@iota/iota-sdk/client';
import { Ed25519Keypair } from '@iota/iota-sdk/keypairs/ed25519';
import { Transaction } from '@iota/iota-sdk/transactions';
import { TransactionField } from '@iota/grpc';

const keypair = Ed25519Keypair.fromSecretKey(secretKey);
const tx = new Transaction();
const [coin] = tx.splitCoins(tx.gas, [1_000]);
tx.transferObjects([coin], recipient);
tx.setSender(keypair.toIotaAddress());

const bytes = await tx.build({ client: new IotaClient({ url: getRpcUrl('testnet') }) });
const { signature } = await keypair.signTransaction(bytes);

const { body } = await client.executeTransaction(
    { transaction: bytes, signatures: [signature] },
    {
        readMask: [TransactionField.EFFECTS, TransactionField.CHECKPOINT],
        // Wait up to 10 seconds for the transaction to land in a checkpoint.
        checkpointInclusionTimeoutMs: 10_000n,
    },
);
console.log(body.checkpoint);
```

`simulateTransaction` runs a transaction without committing it. With an empty gas payment, the
node pays with a mock coin, so the sender does not need to own any:

```ts
import { decodeTransactionEffects } from '@iota/grpc';

const tx = new Transaction();
tx.setSender(sender);
tx.setGasPrice(referenceGasPrice);
tx.setGasBudget(50_000_000n);
tx.setGasPayment([]);
const [coin] = tx.splitCoins(tx.gas, [1]);
tx.transferObjects([coin], sender);

const { body } = await client.simulateTransaction({ transaction: await tx.build() });
const effects = decodeTransactionEffects(body.executedTransaction!.effects!);
console.log(effects.V1.status, body.suggestedGasPrice);
```

`viewFunctionCall` calls a Move function declared `#[view]` and returns what it returned, without
a transaction. Arguments are JSON, which the node encodes against the parameter types. Pass a
`bigint` for any integer above `Number.MAX_SAFE_INTEGER`, or a `Uint8Array` for an argument you
encoded as BCS yourself:

```ts
const { body } = await client.viewFunctionCall({
    fqFunctionName: '0x1234::shop::discounted_price',
    args: [100, 25n],
});

if (body.executionResult.case === 'returnValues') {
    console.log(body.executionResult.value.outputs.map((output) => output.json));
} else {
    // The function ran but aborted.
    console.log(body.executionResult.value);
}
```

Each of these has a batch form, `executeTransactions`, `simulateTransactions` and
`viewFunctionCalls`, which returns one result per item like `getObjects` does.

## Streaming checkpoints

`streamCheckpoints` follows the chain from `startSequenceNumber`, or from the latest checkpoint
when omitted, and keeps going until `endSequenceNumber` or until you stop it. Like
`getCheckpoint`, it sends only each checkpoint's summary unless the read mask asks for more:

```ts
import { CheckpointResponseField } from '@iota/grpc';

const controller = new AbortController();
process.on('SIGINT', () => controller.abort());

const stream = client.streamCheckpoints({
    readMask: [
        CheckpointResponseField.CHECKPOINT_SUMMARY,
        CheckpointResponseField.TRANSACTIONS_TRANSACTION_DIGEST,
    ],
    signal: controller.signal,
});

try {
    for await (const item of stream.items) {
        if (item.kind === 'checkpoint') {
            console.log(item.sequenceNumber, item.transactions.length);
        }
    }
} catch (error) {
    // Aborting ends the stream with a `TransportError` whose code is `Code.Canceled`.
    if (!controller.signal.aborted) {
        throw error;
    }
}
```

With `filterCheckpoints`, the node only sends checkpoints with a transaction or event that matches
`transactionsFilter` or `eventsFilter`. In between, `progress` items report how far it has scanned:

```ts
const stream = client.streamCheckpoints({
    readMask: [CheckpointResponseField.CHECKPOINT_SUMMARY, CheckpointResponseField.EVENTS],
    eventsFilter: {
        filter: { case: 'moveEventType', value: { structTag: '0x3::validator::StakingRequestEvent' } },
    },
    filterCheckpoints: true,
    progressIntervalMs: 5_000,
});

for await (const item of stream.items) {
    if (item.kind === 'progress') {
        console.log('scanned up to', item.latestScannedSequenceNumber);
    } else {
        console.log('stake requests in', item.sequenceNumber, item.events.length);
    }
}
```

A stream that drops throws from the loop. To carry on, start a new one with `startSequenceNumber`
set to the one after the last checkpoint you received.

## Errors

Every error the client throws extends `IotaGrpcError`:

| Error                       | When                                                                            |
| --------------------------- | ------------------------------------------------------------------------------- |
| `TransportError`            | The call itself failed: unreachable node, timeout, cancelled, or refused. `code` is Connect's `Code` |
| `ServerError`               | The node refused one item of a batch. It is in that item's slot, and thrown by the single-item methods |
| `EmptyRequestError`         | A batch was called with no items                                                |
| `ProtocolError` and subclasses | The node's answer broke the API contract, such as a different number of results than asked for |
| `ProtoConversionError`      | A field could not be decoded                                                    |

A malformed object ID, address or digest throws a `TypeError` before anything is sent.

## Limitations

The client speaks plain gRPC over HTTP/2, which browsers cannot. The public endpoints do not
serve gRPC-Web yet, so `createGrpcWebTransport` throws until they do. Use it from Node, Bun or
Deno.

| Network    | Endpoint                         |
| ---------- | -------------------------------- |
| `mainnet`  | `https://grpc.mainnet.iota.cafe` |
| `testnet`  | `https://grpc.testnet.iota.cafe` |
| `devnet`   | `https://grpc.devnet.iota.cafe`  |
| `localnet` | `http://localhost:50051`         |

A local node serves gRPC only when its fullnode config turns the API on and gives it an address:

```bash
iota-localnet start --with-faucet \
    --node-config-override fullnode:enable-grpc-api=true \
    --node-config-override "fullnode:grpc-api-config={address: '0.0.0.0:50051'}"
```

## Testing

To run unit tests

```bash
pnpm --filter @iota/grpc test
```

To run E2E tests against mainnet, testnet and devnet

```bash
pnpm --filter @iota/grpc test:e2e
```

To run E2E tests against a local network

```bash
# Starts a local network with a faucet and the gRPC API on
pnpm --filter @iota/grpc prepare:e2e:localnet

# In another terminal, once it is up
pnpm --filter @iota/grpc test:e2e:localnet
```
