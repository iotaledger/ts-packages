// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type BalanceChange, type IotaCallArg, type IotaTransaction } from '@iota/iota-sdk/client';
import { normalizeIotaAddress } from '@iota/iota-sdk/utils';

import { type IotaObjectChangeWithDisplay } from '../../types';
import { COIN_TYPE } from '../../constants';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type EffectRow =
    | {
          kind: 'transfer-nft';
          name: string;
          objectId: string;
          recipient: string;
          source?: 'kiosk';
          kioskId?: string;
          thumbnail?: string;
      }
    | {
          kind: 'receive-nft';
          name: string;
          objectId: string;
          sender?: string;
          source?: 'kiosk';
          kioskId?: string;
          thumbnail?: string;
      }
    | { kind: 'coin-send'; coinType: string; amount: bigint; recipient: string }
    | { kind: 'coin-receive'; coinType: string; amount: bigint; sender?: string }
    | { kind: 'publish'; packageId: string }
    | { kind: 'upgrade'; packageId: string }
    /** Known package, but pattern not recognized — shows module::fn. */
    | { kind: 'call'; packageId: string; module: string; fn: string }
    /** Unknown / unverified package. */
    | { kind: 'unknown-call'; packageId: string; module: string; fn: string };

export type StructuralSummary = {
    callCount: number;
    uniquePackages: string[];
    newObjects: number;
    transferredObjects: number;
    packages: {
        packageId: string;
        isKnown: boolean;
        callCount: number;
        functions: { module: string; fn: string; count: number }[];
    }[];
    objectChanges: {
        created: number;
        transferred: number;
        mutated: number;
        deleted: number;
        wrapped: number;
        unwrapped: number;
        published: number;
    };
};

export type PtbRecognitionResult =
    | { recognized: true; rows: EffectRow[] }
    | { recognized: false; rows: EffectRow[]; structural: StructuralSummary };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isCoin(objectType: string): boolean {
    return objectType.startsWith(COIN_TYPE);
}

function ownerToAddress(owner: unknown): string {
    if (!owner || typeof owner !== 'object') return '';
    if ('AddressOwner' in owner) return String((owner as { AddressOwner: string }).AddressOwner);
    if ('ObjectOwner' in owner) return String((owner as { ObjectOwner: string }).ObjectOwner);
    if ('Shared' in owner) return 'Shared';
    return '';
}

function getObjectDisplayName(change: IotaObjectChangeWithDisplay): string {
    return (
        change.display?.data?.['name'] ??
        ('objectType' in change ? change.objectType.split('::').pop()?.split('<')[0] : undefined) ??
        'Object'
    );
}

function getObjectThumbnail(change: IotaObjectChangeWithDisplay): string | undefined {
    return change.display?.data?.['image_url'] ?? undefined;
}

function objectOwnerMatchesPerspective(
    change: IotaObjectChangeWithDisplay,
    perspective: string,
): boolean {
    if ('owner' in change) {
        return ownerToAddress(change.owner) === perspective;
    }

    if ('recipient' in change) {
        return ownerToAddress(change.recipient) === perspective;
    }

    return false;
}

function resolveInputAddress(inputs: IotaCallArg[], arg: unknown): string | undefined {
    if (arg && typeof arg === 'object' && 'Input' in (arg as object)) {
        const idx = (arg as { Input: number }).Input;
        const inp = inputs[idx];
        if (inp?.type === 'pure' && inp.valueType === 'address') {
            return String(inp.value);
        }
    }
    return undefined;
}

function resolveInputObjectId(inputs: IotaCallArg[], arg: unknown): string | undefined {
    if (arg && typeof arg === 'object' && 'Input' in (arg as object)) {
        const idx = (arg as { Input: number }).Input;
        const inp = inputs[idx];
        if (inp?.type === 'object') {
            return inp.objectId;
        }
    }
    return undefined;
}

function resolveInputValue(inputs: IotaCallArg[], arg: unknown): string | undefined {
    if (arg && typeof arg === 'object' && 'Input' in (arg as object)) {
        const idx = (arg as { Input: number }).Input;
        const inp = inputs[idx];
        if (inp?.type === 'pure') {
            return String(inp.value);
        }
    }
    return undefined;
}

function resolveProducedResultIndex(arg: unknown): number | undefined {
    if (!arg || typeof arg !== 'object') return undefined;
    if ('Result' in (arg as object)) {
        return (arg as { Result: number }).Result;
    }
    if ('NestedResult' in (arg as object)) {
        return (arg as { NestedResult: [number, number] }).NestedResult[0];
    }
    return undefined;
}

function normalizePackageId(packageId: string): string {
    try {
        return normalizeIotaAddress(packageId);
    } catch {
        return packageId;
    }
}

function buildStructural(
    commands: IotaTransaction[],
    objectChanges: IotaObjectChangeWithDisplay[],
    recognizedPackages: string[],
): StructuralSummary {
    const normalizedRecognizedPackages = recognizedPackages.map(normalizePackageId);
    const packages = new Map<
        string,
        {
            packageId: string;
            isKnown: boolean;
            callCount: number;
            functions: Map<string, { module: string; fn: string; count: number }>;
        }
    >();
    let callCount = 0;
    for (const cmd of commands) {
        if ('MoveCall' in cmd) {
            callCount++;
            const pkg = normalizePackageId(cmd.MoveCall.package);
            const key = `${cmd.MoveCall.module}::${cmd.MoveCall.function}`;
            const packageEntry = packages.get(pkg) ?? {
                packageId: pkg,
                isKnown: normalizedRecognizedPackages.includes(pkg),
                callCount: 0,
                functions: new Map<string, { module: string; fn: string; count: number }>(),
            };

            packageEntry.callCount += 1;
            const functionEntry = packageEntry.functions.get(key) ?? {
                module: cmd.MoveCall.module,
                fn: cmd.MoveCall.function,
                count: 0,
            };
            functionEntry.count += 1;
            packageEntry.functions.set(key, functionEntry);
            packages.set(pkg, packageEntry);
        }
    }
    const newObjects = objectChanges.filter((c) => c.type === 'created').length;
    const transferredObjects = objectChanges.filter((c) => c.type === 'transferred').length;

    const objectCounts = {
        created: objectChanges.filter((c) => c.type === 'created').length,
        transferred: objectChanges.filter((c) => c.type === 'transferred').length,
        mutated: objectChanges.filter((c) => c.type === 'mutated').length,
        deleted: objectChanges.filter((c) => c.type === 'deleted').length,
        wrapped: objectChanges.filter((c) => c.type === 'wrapped').length,
        unwrapped: objectChanges.filter((c) => c.type === 'unwrapped').length,
        published: objectChanges.filter((c) => c.type === 'published').length,
    };

    return {
        callCount,
        uniquePackages: [...packages.keys()],
        newObjects,
        transferredObjects,
        packages: [...packages.values()]
            .map((entry) => ({
                packageId: entry.packageId,
                isKnown: entry.isKnown,
                callCount: entry.callCount,
                functions: [...entry.functions.values()].sort(
                    (left, right) => right.count - left.count,
                ),
            }))
            .sort((left, right) => right.callCount - left.callCount),
        objectChanges: objectCounts,
    };
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export function recognizePtbEffects({
    commands,
    inputs,
    objectChangesWithDisplay,
    balanceChanges,
    perspective,
    recognizedPackages,
}: {
    commands: IotaTransaction[];
    inputs: IotaCallArg[];
    objectChangesWithDisplay: IotaObjectChangeWithDisplay[];
    balanceChanges: BalanceChange[];
    perspective: string;
    recognizedPackages: string[];
}): PtbRecognitionResult {
    const rows: EffectRow[] = [];
    let hasUnknown = false;
    const objectRowKeys = new Set<string>();
    const normalizedRecognizedPackages = recognizedPackages.map(normalizePackageId);

    // Build a quick lookup of objectId → objectChange
    const changeById = new Map<string, IotaObjectChangeWithDisplay>();
    for (const c of objectChangesWithDisplay) {
        if ('objectId' in c) changeById.set(c.objectId, c);
    }

    // Track which commands were absorbed by higher-level matchers
    const absorbedCommandIndices = new Set<number>();

    const resultTransferInfos: Array<{
        producerIndex: number;
        transferCommandIndex: number;
        recipient?: string;
    }> = [];
    const directObjectTransferCommandIndices = new Map<string, number[]>();
    const kioskTakeByCommandIndex = new Map<number, { kioskId?: string; itemId?: string }>();

    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        if ('TransferObjects' in cmd) {
            const [objects, recipientArg] = cmd.TransferObjects;
            const recipient = resolveInputAddress(inputs, recipientArg);

            for (const objArg of objects) {
                const directObjectId = resolveInputObjectId(inputs, objArg);
                if (directObjectId) {
                    const existing = directObjectTransferCommandIndices.get(directObjectId) ?? [];
                    existing.push(i);
                    directObjectTransferCommandIndices.set(directObjectId, existing);
                    continue;
                }

                const producerIndex = resolveProducedResultIndex(objArg);
                if (producerIndex !== undefined) {
                    resultTransferInfos.push({
                        producerIndex,
                        transferCommandIndex: i,
                        recipient,
                    });
                }
            }
        }

        if (
            'MoveCall' in cmd &&
            normalizePackageId(cmd.MoveCall.package) === normalizePackageId('0x2') &&
            cmd.MoveCall.module === 'kiosk' &&
            cmd.MoveCall.function === 'take'
        ) {
            const args = cmd.MoveCall.arguments ?? [];
            const [kioskArg, , itemIdArg] = args;
            kioskTakeByCommandIndex.set(i, {
                kioskId: resolveInputObjectId(inputs, kioskArg),
                itemId: resolveInputValue(inputs, itemIdArg),
            });
        }
    }

    const consumedResultTransferInfos = new Set<number>();

    const pushObjectRow = (row: EffectRow, key: string) => {
        if (objectRowKeys.has(key)) return;
        objectRowKeys.add(key);
        rows.push(row);
    };

    // --- Non-coin object transfers from effects ---
    for (const change of objectChangesWithDisplay) {
        if (change.type !== 'transferred' || isCoin(change.objectType)) continue;

        const recipient = ownerToAddress(change.recipient);
        const transferCommandIndices =
            directObjectTransferCommandIndices.get(change.objectId) ?? [];
        for (const commandIndex of transferCommandIndices) {
            absorbedCommandIndices.add(commandIndex);
        }

        let source: 'kiosk' | undefined;
        let kioskId: string | undefined;

        const exactResultInfoIndex = resultTransferInfos.findIndex((info, index) => {
            if (consumedResultTransferInfos.has(index)) return false;
            const kioskTake = kioskTakeByCommandIndex.get(info.producerIndex);
            return kioskTake?.itemId === change.objectId;
        });

        const fallbackResultInfoIndex =
            exactResultInfoIndex !== -1
                ? exactResultInfoIndex
                : resultTransferInfos.findIndex((info, index) => {
                      if (consumedResultTransferInfos.has(index)) return false;
                      if (info.recipient && info.recipient !== recipient) return false;
                      return true;
                  });

        const matchedResultInfoIndex =
            exactResultInfoIndex !== -1 ? exactResultInfoIndex : fallbackResultInfoIndex;

        if (matchedResultInfoIndex !== -1) {
            consumedResultTransferInfos.add(matchedResultInfoIndex);
            const matchedResultInfo = resultTransferInfos[matchedResultInfoIndex];
            absorbedCommandIndices.add(matchedResultInfo.transferCommandIndex);
            absorbedCommandIndices.add(matchedResultInfo.producerIndex);

            const kioskTake = kioskTakeByCommandIndex.get(matchedResultInfo.producerIndex);
            if (kioskTake?.itemId === change.objectId) {
                source = 'kiosk';
                kioskId = kioskTake.kioskId;
            }
        }

        const isOutgoing =
            !!perspective && change.sender === perspective && recipient !== perspective;
        const isIncoming =
            !!perspective && recipient === perspective && change.sender !== perspective;
        const isKioskSelfMove = !!perspective && recipient === perspective && source === 'kiosk';

        if (!isOutgoing && !isIncoming && !isKioskSelfMove) continue;

        const name = getObjectDisplayName(change);
        const thumbnail = getObjectThumbnail(change);

        if (isOutgoing) {
            pushObjectRow(
                {
                    kind: 'transfer-nft',
                    name,
                    objectId: change.objectId,
                    recipient,
                    source,
                    kioskId,
                    thumbnail,
                },
                `transfer:${change.objectId}:${recipient}`,
            );
        } else if (isIncoming || isKioskSelfMove) {
            pushObjectRow(
                {
                    kind: 'receive-nft',
                    name,
                    objectId: change.objectId,
                    sender: change.sender,
                    source,
                    kioskId,
                    thumbnail,
                },
                `receive:${change.objectId}:${change.sender}`,
            );
        }
    }

    // --- Standalone kiosk takes that return an object directly to the signer ---
    for (const [commandIndex, kioskTake] of kioskTakeByCommandIndex.entries()) {
        if (absorbedCommandIndices.has(commandIndex) || !kioskTake.itemId || !perspective) continue;

        const change = changeById.get(kioskTake.itemId);
        if (!change || !('objectType' in change) || isCoin(change.objectType)) continue;
        if (!objectOwnerMatchesPerspective(change, perspective)) continue;
        if (
            change.type !== 'mutated' &&
            change.type !== 'unwrapped' &&
            change.type !== 'transferred'
        ) {
            continue;
        }

        const name = getObjectDisplayName(change);
        const thumbnail = getObjectThumbnail(change);

        pushObjectRow(
            {
                kind: 'receive-nft',
                name,
                objectId: change.objectId,
                sender: 'sender' in change ? change.sender : undefined,
                source: 'kiosk',
                kioskId: kioskTake.kioskId,
                thumbnail,
            },
            `receive:${change.objectId}:kiosk:${commandIndex}`,
        );
        absorbedCommandIndices.add(commandIndex);
    }

    // --- Coin sends / receives from balance changes ---
    // Emit one row per (direction, coinType, counterparty) triple — deduplicate on that key.
    const coinRowKeys = new Set<string>();

    for (const bc of balanceChanges) {
        const owner =
            typeof bc.owner === 'string'
                ? bc.owner
                : 'AddressOwner' in bc.owner
                  ? bc.owner.AddressOwner
                  : '';
        if (!owner || owner === 'Shared') continue;
        const amount = BigInt(bc.amount);

        if (owner === perspective && amount < 0n) {
            // Perspective is spending this coin — find all distinct recipients for this coinType
            const recipients = balanceChanges
                .filter((r) => {
                    if (r.coinType !== bc.coinType) return false;
                    if (BigInt(r.amount) <= 0n) return false;
                    const rOwner =
                        typeof r.owner === 'object' && 'AddressOwner' in r.owner
                            ? r.owner.AddressOwner
                            : '';
                    return rOwner && rOwner !== perspective;
                })
                .map((r) =>
                    typeof r.owner === 'object' && 'AddressOwner' in r.owner
                        ? r.owner.AddressOwner
                        : '',
                )
                .filter((addr): addr is string => !!addr);

            for (const recipient of recipients) {
                const key = `send:${bc.coinType}:${recipient}`;
                if (!coinRowKeys.has(key)) {
                    coinRowKeys.add(key);
                    rows.push({
                        kind: 'coin-send',
                        coinType: bc.coinType,
                        amount: -amount,
                        recipient,
                    });
                }
            }
        } else if (owner === perspective && amount > 0n) {
            // Perspective is receiving — one row per coinType (ignore sender; not reliably available)
            const key = `receive:${bc.coinType}`;
            if (!coinRowKeys.has(key)) {
                coinRowKeys.add(key);
                rows.push({ kind: 'coin-receive', coinType: bc.coinType, amount });
            }
        }
    }

    // --- Walk PTB commands ---
    for (let i = 0; i < commands.length; i++) {
        if (absorbedCommandIndices.has(i)) continue;
        const cmd = commands[i];

        if ('TransferObjects' in cmd) {
            const [objects, recipientArg] = cmd.TransferObjects;
            const recipient = resolveInputAddress(inputs, recipientArg);

            for (const objArg of objects) {
                const objectId = resolveInputObjectId(inputs, objArg);
                if (!objectId) continue;

                const change = changeById.get(objectId);
                if (!change || !('objectType' in change)) continue;
                if (isCoin(change.objectType)) continue; // handled by balance changes

                const name = getObjectDisplayName(change);
                const thumbnail = getObjectThumbnail(change);

                if (recipient && recipient !== perspective) {
                    pushObjectRow(
                        { kind: 'transfer-nft', name, objectId, recipient, thumbnail },
                        `transfer:${objectId}:${recipient}`,
                    );
                    absorbedCommandIndices.add(i);
                } else if (recipient === perspective) {
                    pushObjectRow(
                        {
                            kind: 'receive-nft',
                            name,
                            objectId,
                            sender: 'sender' in change ? change.sender : undefined,
                            thumbnail,
                        },
                        `receive:${objectId}:${'sender' in change ? change.sender : ''}`,
                    );
                    absorbedCommandIndices.add(i);
                }
            }
            // Even if no object resolved (e.g. Result args), mark absorbed if all objects were coins
            if (!absorbedCommandIndices.has(i)) {
                // Might be a coin transfer — absorbed by balance change rows
                absorbedCommandIndices.add(i);
            }
        } else if ('Publish' in cmd) {
            const published = objectChangesWithDisplay.find((c) => c.type === 'published');
            if (published && 'packageId' in published) {
                rows.push({ kind: 'publish', packageId: published.packageId });
            }
            absorbedCommandIndices.add(i);
        } else if ('Upgrade' in cmd) {
            const [, packageId] = cmd.Upgrade;
            rows.push({ kind: 'upgrade', packageId });
            absorbedCommandIndices.add(i);
        } else if ('MoveCall' in cmd) {
            // Leave unabsorbed — will be handled as fallback below
        } else {
            // SplitCoins, MergeCoins, MakeMoveVec — internal plumbing, absorb silently
            absorbedCommandIndices.add(i);
        }
    }

    // --- MoveCall fallback for unabsorbed commands ---
    for (let i = 0; i < commands.length; i++) {
        if (absorbedCommandIndices.has(i)) continue;
        const cmd = commands[i];
        if (!('MoveCall' in cmd)) continue;

        const { module, function: fn } = cmd.MoveCall;
        const pkg = normalizePackageId(cmd.MoveCall.package);
        const isKnown = normalizedRecognizedPackages.includes(pkg);
        if (isKnown) {
            rows.push({ kind: 'call', packageId: pkg, module, fn });
        } else {
            rows.push({ kind: 'unknown-call', packageId: pkg, module, fn });
            hasUnknown = true;
        }
    }

    if (hasUnknown) {
        return {
            recognized: false,
            rows,
            structural: buildStructural(commands, objectChangesWithDisplay, recognizedPackages),
        };
    }

    return { recognized: true, rows };
}
