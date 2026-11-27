// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type IotaMoveNormalizedType } from '@iota/iota-sdk/client';
import { formatAddress } from '@iota/iota-sdk/utils';

export function formatMoveType(
    type: IotaMoveNormalizedType,
    packageId?: string,
    typeParameterNames: string[] = [],
): string {
    if (typeof type === 'string') {
        return type.toLowerCase();
    }

    if ('Reference' in type) {
        return `&${formatMoveType(type.Reference, packageId, typeParameterNames)}`;
    }

    if ('MutableReference' in type) {
        return `&mut ${formatMoveType(type.MutableReference, packageId, typeParameterNames)}`;
    }

    if ('Vector' in type) {
        return `vector<${formatMoveType(type.Vector, packageId, typeParameterNames)}>`;
    }

    if ('TypeParameter' in type) {
        return typeParameterNames[type.TypeParameter] ?? `T${type.TypeParameter}`;
    }

    const { address, module, name, typeArguments } = type.Struct;
    const args = typeArguments.length
        ? `<${typeArguments
              .map((argument) => formatMoveType(argument, packageId, typeParameterNames))
              .join(', ')}>`
        : '';
    const isOwnPackage = !!packageId && normalize(address) === normalize(packageId);
    const prefix = isOwnPackage ? '' : `${formatAddress(address)}::${module}::`;

    return `${prefix}${name}${args}`;
}

function normalize(address: string): string {
    return address.replace(/^0x0*/, '');
}

export function getTypeParameterNames(count: number): string[] {
    return Array.from({ length: count }, (_, index) => `T${index}`);
}
