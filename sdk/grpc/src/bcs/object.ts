// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@iota/iota-sdk/bcs';

import { versioned } from './versioned.js';

const MoveObjectType = bcs.enum('MoveObjectType', {
    Other: bcs.StructTag,
    GasCoin: null,
    StakedIota: null,
    Coin: bcs.TypeTag,
});

const MoveStruct = bcs.struct('MoveStruct', {
    objectType: MoveObjectType,
    version: bcs.u64(),
    contents: bcs.byteVector(),
});

const TypeOrigin = bcs.struct('TypeOrigin', {
    moduleName: bcs.string(),
    datatypeName: bcs.string(),
    package: bcs.Address,
});

const UpgradeInfo = bcs.struct('UpgradeInfo', {
    upgradedId: bcs.Address,
    upgradedVersion: bcs.u64(),
});

const MovePackage = bcs.struct('MovePackage', {
    id: bcs.Address,
    version: bcs.u64(),
    modules: bcs.map(bcs.string(), bcs.byteVector()),
    typeOriginTable: bcs.vector(TypeOrigin),
    linkageTable: bcs.map(bcs.Address, UpgradeInfo),
});

const ObjectData = bcs.enum('ObjectData', {
    Struct: MoveStruct,
    Package: MovePackage,
});

export const IotaObject = bcs.struct('Object', {
    data: ObjectData,
    owner: bcs.Owner,
    previousTransaction: bcs.ObjectDigest,
    storageRebate: bcs.u64(),
});

export type IotaObject = typeof IotaObject.$inferType;

export const VersionedObject = versioned('Object', IotaObject);
