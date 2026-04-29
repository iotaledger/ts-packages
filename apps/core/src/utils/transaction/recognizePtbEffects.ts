// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type BalanceChange, type IotaCallArg, type IotaTransaction } from '@iota/iota-sdk/client';

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
          thumbnail?: string;
      }
    | {
          kind: 'receive-nft';
          name: string;
          objectId: string;
          sender?: string;
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

function buildStructural(
    commands: IotaTransaction[],
    objectChanges: IotaObjectChangeWithDisplay[],
): StructuralSummary {
    const packages = new Set<string>();
    let callCount = 0;
    for (const cmd of commands) {
        if ('MoveCall' in cmd) {
            callCount++;
            packages.add(cmd.MoveCall.package);
        }
    }
    const newObjects = objectChanges.filter((c) => c.type === 'created').length;
    const transferredObjects = objectChanges.filter((c) => c.type === 'transferred').length;
    return {
        callCount,
        uniquePackages: [...packages],
        newObjects,
        transferredObjects,
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

    // Build a quick lookup of objectId → objectChange
    const changeById = new Map<string, IotaObjectChangeWithDisplay>();
    for (const c of objectChangesWithDisplay) {
        if ('objectId' in c) changeById.set(c.objectId, c);
    }

    // Track which commands were absorbed by higher-level matchers
    const absorbedCommandIndices = new Set<number>();

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

                const name =
                    change.display?.data?.['name'] ??
                    change.objectType.split('::').pop()?.split('<')[0] ??
                    'Object';
                const thumbnail = change.display?.data?.['image_url'] ?? undefined;

                if (recipient && recipient !== perspective) {
                    rows.push({ kind: 'transfer-nft', name, objectId, recipient, thumbnail });
                    absorbedCommandIndices.add(i);
                } else if (recipient === perspective) {
                    rows.push({ kind: 'receive-nft', name, objectId, thumbnail });
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

        const { package: pkg, module, function: fn } = cmd.MoveCall;
        const isKnown = recognizedPackages.includes(pkg);
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
            structural: buildStructural(commands, objectChangesWithDisplay),
        };
    }

    return { recognized: true, rows };
}
