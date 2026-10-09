// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { fromBase64 } from '@iota/bcs';
import { parse } from 'valibot';

import type { BcsType } from '../bcs/index.js';
import { bcs } from '../bcs/index.js';
import type { IotaClient } from '../client/client.js';
import type { CoinStruct } from '../client/index.js';
import { normalizeIotaAddress, normalizeIotaObjectId, IOTA_TYPE_ARG } from '../utils/index.js';
import { ObjectRef } from './data/internal.js';
import type { Argument, CallArg, Command, OpenMoveTypeSignature } from './data/internal.js';
import { Inputs } from './Inputs.js';
import { getPureBcsSchema, isTxContext, normalizedTypeToMoveTypeSignature } from './serializer.js';
import type { TransactionDataBuilder } from './TransactionData.js';

// The maximum objects that can be fetched at once using multiGetObjects.
const MAX_OBJECTS_PER_FETCH = 50;

// An amount of gas (in gas units) that is added to transactions as an overhead to ensure transactions do not fail.
const GAS_SAFE_OVERHEAD = 1000n;
const MAX_GAS = 50_000_000_000;
// The protocol requires fewer than `max_gas_payment_objects` (256) gas coins.
const MAX_GAS_OBJECTS = 255;

export interface BuildTransactionOptions {
    client?: IotaClient;
    onlyTransactionKind?: boolean;
    maxSizeBytes?: number;
}

export interface SerializeTransactionOptions extends BuildTransactionOptions {
    supportedIntents?: string[];
}

export type TransactionPlugin = (
    transactionData: TransactionDataBuilder,
    options: BuildTransactionOptions,
    next: () => Promise<void>,
) => Promise<void>;

export async function resolveTransactionData(
    transactionData: TransactionDataBuilder,
    options: BuildTransactionOptions,
    next: () => Promise<void>,
) {
    await normalizeInputs(transactionData, options);
    await resolveObjectReferences(transactionData, options);

    if (!options.onlyTransactionKind) {
        await setGasPrice(transactionData, options);
        await setGasBudget(transactionData, options);
        await setGasPayment(transactionData, options);
    }
    await validate(transactionData);
    return await next();
}

async function setGasPrice(
    transactionData: TransactionDataBuilder,
    options: BuildTransactionOptions,
) {
    if (!transactionData.gasData.price) {
        transactionData.gasData.price = String(await getClient(options).getReferenceGasPrice());
    }
}

async function setGasBudget(
    transactionData: TransactionDataBuilder,
    options: BuildTransactionOptions,
) {
    if (transactionData.gasData.budget) {
        return;
    }

    const dryRunResult = await getClient(options).dryRunTransactionBlock({
        transactionBlock: transactionData.build({
            overrides: {
                gasData: {
                    budget: String(MAX_GAS),
                    payment: [],
                },
            },
        }),
    });

    if (dryRunResult.effects.status.status !== 'success') {
        throw new Error(
            `Dry run failed, could not automatically determine a budget: ${dryRunResult.effects.status.error}`,
            { cause: dryRunResult },
        );
    }

    const safeOverhead = GAS_SAFE_OVERHEAD * BigInt(transactionData.gasData.price || 1n);

    const baseComputationCostWithOverhead =
        BigInt(dryRunResult.effects.gasUsed.computationCost) + safeOverhead;

    const gasBudget =
        baseComputationCostWithOverhead +
        BigInt(dryRunResult.effects.gasUsed.storageCost) -
        BigInt(dryRunResult.effects.gasUsed.storageRebate);

    transactionData.gasData.budget = String(
        gasBudget > baseComputationCostWithOverhead ? gasBudget : baseComputationCostWithOverhead,
    );
}

// Uses all coins of the first page. If the owner has more pages, keeps the highest-balance coins
// seen so far and only fetches the next page while they cannot pay for the transaction.
async function setGasPayment(
    transactionData: TransactionDataBuilder,
    options: BuildTransactionOptions,
) {
    if (transactionData.gasData.payment) {
        return;
    }

    const client = getClient(options);
    const inputObjectIds = new Set(
        transactionData.inputs.flatMap((input) =>
            input.Object?.ImmOrOwnedObject ? [input.Object.ImmOrOwnedObject.objectId] : [],
        ),
    );

    let paymentCoins: CoinStruct[] = [];
    let cursor: string | null | undefined = null;
    let hasNextPage = true;
    let seenCoins = 0;

    while (hasNextPage) {
        const page = await client.getCoins({
            owner: transactionData.gasData.owner || transactionData.sender!,
            coinType: IOTA_TYPE_ARG,
            cursor,
        });
        cursor = page.nextCursor;
        hasNextPage = page.hasNextPage;

        // Filter out coins that are also used as input:
        const availableCoins = page.data.filter((coin) => !inputObjectIds.has(coin.coinObjectId));
        seenCoins += availableCoins.length;

        paymentCoins = [...paymentCoins, ...availableCoins]
            .sort((a, b) => {
                const diff = BigInt(b.balance) - BigInt(a.balance);
                return diff > 0n ? 1 : diff < 0n ? -1 : 0;
            })
            .slice(0, MAX_GAS_OBJECTS);

        if (hasNextPage && (await canPayGas(transactionData, paymentCoins, client))) {
            break;
        }
    }

    if (!paymentCoins.length) {
        throw new Error('No valid gas coins found for the transaction.');
    }

    if (
        !hasNextPage &&
        seenCoins > MAX_GAS_OBJECTS &&
        !(await canPayGas(transactionData, paymentCoins, client))
    ) {
        throw new Error(
            `Not enough balance in ${MAX_GAS_OBJECTS} gas coins. Merge your coins or add funds.`,
        );
    }

    transactionData.gasData.payment = toGasPayment(paymentCoins);
}

async function canPayGas(
    transactionData: TransactionDataBuilder,
    coins: CoinStruct[],
    client: IotaClient,
) {
    const balance = coins.reduce((total, coin) => total + BigInt(coin.balance), 0n);
    const budget = BigInt(transactionData.gasData.budget ?? 0);
    if (balance < budget) {
        return false;
    }

    const gasCoinSplitAmount = getGasCoinSplitAmount(transactionData);
    if (gasCoinSplitAmount !== null) {
        // The budget is reserved inside the gas coin, so only `balance - budget` can be split from it.
        return balance - budget >= gasCoinSplitAmount;
    }

    const dryRunResult = await client.dryRunTransactionBlock({
        transactionBlock: transactionData.build({
            overrides: { gasData: { payment: toGasPayment(coins) } },
        }),
    });
    const error = dryRunResult.effects.status.error ?? '';

    return (
        !error.includes('InsufficientCoinBalance') && !error.includes('Insufficient coin balance')
    );
}

function getGasCoinSplitAmount(transactionData: TransactionDataBuilder): bigint | null {
    let isStaticallyKnown = true;
    transactionData.mapArguments((arg, command) => {
        if (arg.$kind !== 'GasCoin') {
            return arg;
        }
        const isSplitSource = command.$kind === 'SplitCoins' && arg === command.SplitCoins.coin;
        const isTransferred =
            command.$kind === 'TransferObjects' && command.TransferObjects.objects.includes(arg);
        if (!isSplitSource && !isTransferred) {
            isStaticallyKnown = false;
        }
        return arg;
    });
    if (!isStaticallyKnown) {
        return null;
    }

    let total = 0n;
    for (const command of transactionData.commands) {
        if (command.$kind !== 'SplitCoins' || command.SplitCoins.coin.$kind !== 'GasCoin') {
            continue;
        }
        for (const amount of command.SplitCoins.amounts) {
            const input = amount.$kind === 'Input' ? transactionData.inputs[amount.Input] : null;
            if (input?.$kind !== 'Pure') {
                return null;
            }
            total += BigInt(bcs.u64().parse(fromBase64(input.Pure.bytes)));
        }
    }
    return total;
}

function toGasPayment(coins: CoinStruct[]) {
    return coins.map((coin) =>
        parse(ObjectRef, {
            objectId: coin.coinObjectId,
            digest: coin.digest,
            version: coin.version,
        }),
    );
}

async function resolveObjectReferences(
    transactionData: TransactionDataBuilder,
    options: BuildTransactionOptions,
) {
    // Keep track of the object references that will need to be resolved at the end of the transaction.
    // We keep the input by-reference to avoid needing to re-resolve it:
    const objectsToResolve = transactionData.inputs.filter((input) => {
        return (
            input.UnresolvedObject &&
            !(input.UnresolvedObject.version || input.UnresolvedObject?.initialSharedVersion)
        );
    }) as Extract<CallArg, { UnresolvedObject: unknown }>[];

    const dedupedIds = [
        ...new Set(
            objectsToResolve.map((input) => normalizeIotaObjectId(input.UnresolvedObject.objectId)),
        ),
    ];

    const objectChunks = dedupedIds.length ? chunk(dedupedIds, MAX_OBJECTS_PER_FETCH) : [];

    const resolvedObjects = new Map();
    const erroredObjects = new Map();

    await Promise.all(
        objectChunks.map(async (chunk) => {
            const chunkObjects = await getClient(options).multiGetObjects({
                ids: chunk,
                options: { showOwner: true },
            });

            for (const object of chunkObjects) {
                const objectId = object.data?.objectId;
                if (objectId) {
                    if (object.error || !object.data) {
                        erroredObjects.set(objectId, object.error);
                        return;
                    }
                    const owner = object.data.owner;
                    const initialSharedVersion =
                        owner && typeof owner === 'object' && 'Shared' in owner
                            ? owner.Shared.initial_shared_version
                            : null;

                    resolvedObjects.set(objectId, {
                        objectId,
                        digest: object.data.digest,
                        version: object.data.version,
                        initialSharedVersion,
                    });
                }
            }
        }),
    );

    if (erroredObjects.size > 0) {
        throw new Error(
            `The following input objects are invalid: ${Array.from(erroredObjects).join(', ')}`,
        );
    }

    for (const [index, input] of transactionData.inputs.entries()) {
        if (!input.UnresolvedObject) {
            continue;
        }

        let updated: CallArg | undefined;
        const id = normalizeIotaAddress(input.UnresolvedObject.objectId);
        const object = resolvedObjects.get(id);

        if (input.UnresolvedObject.initialSharedVersion ?? object?.initialSharedVersion) {
            updated = Inputs.SharedObjectRef({
                objectId: id,
                initialSharedVersion:
                    input.UnresolvedObject.initialSharedVersion ||
                    (object?.initialSharedVersion as string),
                mutable: input.UnresolvedObject.mutable || isUsedAsMutable(transactionData, index),
            });
        } else if (isUsedAsReceiving(transactionData, index)) {
            updated = Inputs.ReceivingRef(
                {
                    objectId: id,
                    digest: input.UnresolvedObject.digest ?? (object?.digest as string),
                    version: input.UnresolvedObject.version ?? (object?.version as string),
                }!,
            );
        }

        transactionData.inputs[transactionData.inputs.indexOf(input)] =
            updated ??
            Inputs.ObjectRef({
                objectId: id,
                digest: input.UnresolvedObject.digest ?? (object?.digest as string),
                version: input.UnresolvedObject.version ?? (object?.version as string),
            });
    }
}

async function normalizeInputs(
    transactionData: TransactionDataBuilder,
    options: BuildTransactionOptions,
) {
    const { inputs, commands } = transactionData;
    const moveCallsToResolve: Extract<Command, { MoveCall: unknown }>['MoveCall'][] = [];
    const moveFunctionsToResolve = new Set<string>();

    commands.forEach((command) => {
        // Special case move call:
        if (command.MoveCall) {
            // Determine if any of the arguments require encoding.
            // - If they don't, then this is good to go.
            // - If they do, then we need to fetch the normalized move module.

            // If we already know the argument types, we don't need to resolve them again
            if (command.MoveCall._argumentTypes) {
                return;
            }

            const inputs = command.MoveCall.arguments.map((arg) => {
                if (arg.$kind === 'Input') {
                    return transactionData.inputs[arg.Input];
                }
                return null;
            });
            const needsResolution = inputs.some(
                (input) =>
                    input?.UnresolvedPure ||
                    (input?.UnresolvedObject &&
                        typeof input?.UnresolvedObject.mutable !== 'boolean'),
            );

            if (needsResolution) {
                const functionName = `${command.MoveCall.package}::${command.MoveCall.module}::${command.MoveCall.function}`;
                moveFunctionsToResolve.add(functionName);
                moveCallsToResolve.push(command.MoveCall);
            }
        }

        // Special handling for values that where previously encoded using the wellKnownEncoding pattern.
        // This should only happen when transaction data was hydrated from an old version of the SDK
        switch (command.$kind) {
            case 'SplitCoins':
                command.SplitCoins.amounts.forEach((amount) => {
                    normalizeRawArgument(amount, bcs.U64, transactionData);
                });
                break;
            case 'TransferObjects':
                normalizeRawArgument(command.TransferObjects.address, bcs.Address, transactionData);
                break;
        }
    });

    const moveFunctionParameters = new Map<string, OpenMoveTypeSignature[]>();
    if (moveFunctionsToResolve.size > 0) {
        const client = getClient(options);
        await Promise.all(
            [...moveFunctionsToResolve].map(async (functionName) => {
                const [packageId, moduleId, functionId] = functionName.split('::');
                const def = await client.getNormalizedMoveFunction({
                    package: packageId,
                    module: moduleId,
                    function: functionId,
                });

                moveFunctionParameters.set(
                    functionName,
                    def.parameters.map((param) => normalizedTypeToMoveTypeSignature(param)),
                );
            }),
        );
    }

    if (moveCallsToResolve.length) {
        await Promise.all(
            moveCallsToResolve.map(async (moveCall) => {
                const parameters = moveFunctionParameters.get(
                    `${moveCall.package}::${moveCall.module}::${moveCall.function}`,
                );

                if (!parameters) {
                    return;
                }

                // Entry functions can have a mutable reference to an instance of the TxContext
                // struct defined in the TxContext module as the last parameter. The caller of
                // the function does not need to pass it in as an argument.
                const hasTxContext = parameters.length > 0 && isTxContext(parameters.at(-1)!);
                const params = hasTxContext
                    ? parameters.slice(0, parameters.length - 1)
                    : parameters;

                moveCall._argumentTypes = params;
            }),
        );
    }

    commands.forEach((command) => {
        if (!command.MoveCall) {
            return;
        }

        const moveCall = command.MoveCall;
        const fnName = `${moveCall.package}::${moveCall.module}::${moveCall.function}`;
        const params = moveCall._argumentTypes;

        if (!params) {
            return;
        }

        if (params.length !== command.MoveCall.arguments.length) {
            throw new Error(`Incorrect number of arguments for ${fnName}`);
        }

        params.forEach((param, i) => {
            const arg = moveCall.arguments[i];
            if (arg.$kind !== 'Input') return;
            const input = inputs[arg.Input];

            // Skip if the input is already resolved
            if (!input.UnresolvedPure && !input.UnresolvedObject) {
                return;
            }

            const inputValue =
                input.UnresolvedPure?.value ?? (input.UnresolvedObject?.objectId as string);

            const inputIndex = inputs.indexOf(input);

            const schema = getPureBcsSchema(param.body);
            if (schema) {
                arg.type = 'pure';
                inputs[inputIndex] = Inputs.Pure(schema.serialize(inputValue));
                return;
            }

            if (typeof inputValue !== 'string') {
                throw new Error(
                    `Expect the argument to be an object id string, got ${JSON.stringify(
                        inputValue,
                        null,
                        2,
                    )}`,
                );
            }

            arg.type = 'object';
            const unresolvedObject: typeof input = input.UnresolvedPure
                ? {
                      $kind: 'UnresolvedObject',
                      UnresolvedObject: {
                          objectId: inputValue,
                      },
                  }
                : input;

            inputs[inputIndex] = unresolvedObject;
        });
    });
}

function validate(transactionData: TransactionDataBuilder) {
    transactionData.inputs.forEach((input, index) => {
        if (input.$kind !== 'Object' && input.$kind !== 'Pure') {
            throw new Error(
                `Input at index ${index} has not been resolved.  Expected a Pure or Object input, but found ${JSON.stringify(
                    input,
                )}`,
            );
        }
    });
}

function normalizeRawArgument(
    arg: Argument,
    schema: BcsType<any>,
    transactionData: TransactionDataBuilder,
) {
    if (arg.$kind !== 'Input') {
        return;
    }
    const input = transactionData.inputs[arg.Input];

    if (input.$kind !== 'UnresolvedPure') {
        return;
    }

    transactionData.inputs[arg.Input] = Inputs.Pure(schema.serialize(input.UnresolvedPure.value));
}

function isUsedAsMutable(transactionData: TransactionDataBuilder, index: number) {
    let usedAsMutable = false;

    transactionData.getInputUses(index, (arg, tx) => {
        if (tx.MoveCall && tx.MoveCall._argumentTypes) {
            const argIndex = tx.MoveCall.arguments.indexOf(arg);
            usedAsMutable = tx.MoveCall._argumentTypes[argIndex].ref !== '&' || usedAsMutable;
        }

        if (tx.$kind === 'MakeMoveVec' || tx.$kind === 'MergeCoins' || tx.$kind === 'SplitCoins') {
            usedAsMutable = true;
        }
    });

    return usedAsMutable;
}

function isUsedAsReceiving(transactionData: TransactionDataBuilder, index: number) {
    let usedAsReceiving = false;

    transactionData.getInputUses(index, (arg, tx) => {
        if (tx.MoveCall && tx.MoveCall._argumentTypes) {
            const argIndex = tx.MoveCall.arguments.indexOf(arg);
            usedAsReceiving =
                isReceivingType(tx.MoveCall._argumentTypes[argIndex]) || usedAsReceiving;
        }
    });

    return usedAsReceiving;
}

function isReceivingType(type: OpenMoveTypeSignature): boolean {
    if (typeof type.body !== 'object' || !('datatype' in type.body)) {
        return false;
    }

    return (
        type.body.datatype.package === '0x2' &&
        type.body.datatype.module === 'transfer' &&
        type.body.datatype.type === 'Receiving'
    );
}

export function getClient(options: BuildTransactionOptions): IotaClient {
    if (!options.client) {
        throw new Error(
            `No iota client passed to Transaction#build, but transaction data was not sufficient to build offline.`,
        );
    }

    return options.client;
}

function chunk<T>(arr: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
        arr.slice(i * size, i * size + size),
    );
}
