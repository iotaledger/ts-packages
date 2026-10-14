// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fromHex } from '@iota/bcs';
import { describe, expect, it } from 'vitest';

import { CheckpointContents, VersionedCheckpointSummary } from '../../../src/bcs/checkpoint.js';
import { VersionedEvent } from '../../../src/bcs/event.js';
import { IotaObject, VersionedObject } from '../../../src/bcs/object.js';
import { VersionedValidatorAggregatedSignature } from '../../../src/bcs/signatures.js';
import { kebabToCamel, readAbnfRule } from '../../abnf.js';

/**
 * Field names and order come from a decoded value, since `@iota/bcs` keeps a
 * struct's fields private and object keys follow declaration order.
 */
const eventsFixture = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../fixtures/events.json'), 'utf8'),
);

const event = VersionedEvent.parse(fromHex(eventsFixture.events[0].bcs)).V1!;

const checkpointsFixture = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../fixtures/checkpoints.json'), 'utf8'),
);

const summary = VersionedCheckpointSummary.parse(
    fromHex(checkpointsFixture.endOfEpoch.summaryBcs),
).V1!;

const endOfEpoch = summary.endOfEpochData!;
const contents = CheckpointContents.parse(fromHex(checkpointsFixture.recent.contentsBcs)).V1!;
const objects = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../fixtures/objects.json'), 'utf8'),
).objects.map(({ bcs }: { bcs: string }) => VersionedObject.parse(fromHex(bcs)).V1!);
const moveStructs = objects.flatMap((object: typeof IotaObject.$inferType) =>
    object.data.Struct ? [object.data.Struct] : [],
);
const movePackage = objects.find((object: typeof IotaObject.$inferType) => object.data.Package)!
    .data.Package!;

function variantNames(rule: string): (string | undefined)[] {
    return readAbnfRule(rule).map(({ name }) => name);
}

const quorumSignature = VersionedValidatorAggregatedSignature.parse(
    fromHex(checkpointsFixture.recent.signatureBcs),
).V1!;

function fieldNames(rule: string): (string | undefined)[] {
    return readAbnfRule(rule).map(({ name }) => name && kebabToCamel(name));
}

describe('BCS schemas match bcs-schema.abnf', () => {
    it('event', () => {
        expect(Object.keys(event)).toEqual(fieldNames('event'));
    });

    it('transaction-events is a vector of unversioned events', () => {
        expect(readAbnfRule('transaction-events')).toEqual([
            { body: '(size *event)', name: undefined },
        ]);
    });

    it('struct-tag, reused from @iota/iota-sdk', () => {
        expect(Object.keys(event.structTag)).toEqual(fieldNames('struct-tag'));
    });

    it('checkpoint-summary', () => {
        expect(Object.keys(summary)).toEqual(fieldNames('checkpoint-summary'));
    });

    it('gas-cost-summary, reused from @iota/iota-sdk', () => {
        expect(Object.keys(summary.epochRollingGasCostSummary)).toEqual(
            fieldNames('gas-cost-summary'),
        );
    });

    it('end-of-epoch-data', () => {
        expect(Object.keys(endOfEpoch)).toEqual(fieldNames('end-of-epoch-data'));
    });

    it('validator-committee-member', () => {
        expect(Object.keys(endOfEpoch.nextEpochCommittee[0])).toEqual(
            fieldNames('validator-committee-member'),
        );
    });

    it('checkpoint-commitment has only the variant the fixture exercises', () => {
        expect(readAbnfRule('checkpoint-commitment')).toEqual([
            { body: '%d00 digest', name: 'EcmhLiveObjectSet' },
        ]);
    });

    it('validator-aggregated-signature', () => {
        expect(Object.keys(quorumSignature)).toEqual(fieldNames('validator-aggregated-signature'));
    });

    it('user-signature is opaque bytes', () => {
        expect(readAbnfRule('user-signature')).toEqual([{ body: 'bytes', name: undefined }]);
    });

    it('checkpoint-contents carries its own V1 discriminant', () => {
        expect(readAbnfRule('checkpoint-contents')).toEqual([
            { body: '%d00 checkpoint-contents-v1', name: 'V1' },
        ]);
    });

    it('checkpoint-contents-v1', () => {
        expect(Object.keys(contents)).toEqual(fieldNames('checkpoint-contents-v1'));
    });

    it('execution-digests', () => {
        expect(Object.keys(contents.digests[0])).toEqual(fieldNames('execution-digests'));
    });

    it('object', () => {
        expect(Object.keys(objects[0])).toEqual(fieldNames('object'));
    });

    it('object-data, every variant in the fixture', () => {
        expect(
            [...new Set(objects.map((o: typeof IotaObject.$inferType) => o.data.$kind))].sort(),
        ).toEqual(variantNames('object-data').sort());
    });

    it('move-struct', () => {
        expect(Object.keys(moveStructs[0])).toEqual(fieldNames('move-struct'));
    });

    it('compressed-struct-tag, every variant in the fixture', () => {
        expect(
            [
                ...new Set(
                    moveStructs.map((s: { objectType: { $kind: string } }) => s.objectType.$kind),
                ),
            ].sort(),
        ).toEqual(variantNames('compressed-struct-tag').sort());
    });

    it('move-package', () => {
        expect(Object.keys(movePackage)).toEqual(fieldNames('move-package'));
    });

    it('type-origin', () => {
        expect(Object.keys(movePackage.typeOriginTable[0])).toEqual(fieldNames('type-origin'));
    });

    it('upgrade-info, which no captured package links', () => {
        const [upgradedId, upgradedVersion] = fieldNames('upgrade-info') as string[];
        const linked = {
            ...objects.find((object: typeof IotaObject.$inferType) => object.data.Package)!,
            data: {
                Package: {
                    ...movePackage,
                    linkageTable: new Map([
                        [movePackage.id, { [upgradedId]: movePackage.id, [upgradedVersion]: '1' }],
                    ]),
                },
            },
        };

        const relinked = IotaObject.parse(IotaObject.serialize(linked as never).toBytes());

        expect(Object.keys([...relinked.data.Package!.linkageTable.values()][0])).toEqual([
            upgradedId,
            upgradedVersion,
        ]);
    });

    it('owner, reused from @iota/iota-sdk, has the same four variants', () => {
        expect(variantNames('owner')).toEqual(['Address', 'Object', 'Shared', 'Immutable']);
    });
});
