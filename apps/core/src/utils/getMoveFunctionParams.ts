// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { IotaMoveNormalizedFunction, IotaMoveNormalizedType } from '@iota/iota-sdk/client';

export function getMoveFunctionParams(
    normalizedFn: IotaMoveNormalizedFunction,
): IotaMoveNormalizedType[] {
    return normalizedFn.parameters.filter((param) => {
        let innerType = param;
        if (typeof param === 'object' && param !== null) {
            if ('Reference' in param) {
                innerType = param.Reference;
            } else if ('MutableReference' in param) {
                innerType = param.MutableReference;
            }
        }

        if (typeof innerType === 'object' && innerType !== null && 'Struct' in innerType) {
            if (innerType.Struct.name === 'TxContext') {
                return false;
            }
        }

        return true;
    });
}
