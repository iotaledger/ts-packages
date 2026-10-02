// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { IotaMoveNormalizedModule } from '@iota/iota-sdk/client';
import { parseStructTag } from '@iota/iota-sdk/utils';
import { getMoveFunctionParams } from './getMoveFunctionParams';

const BURN_FUNCTION_KEYWORDS = ['burn', 'destroy', 'delete'];
const burnKeywordRegex = new RegExp(BURN_FUNCTION_KEYWORDS.join('|'), 'i');

export function getBurnFunctionCandidates(
    normalizedModule: IotaMoveNormalizedModule,
    objStruct: ReturnType<typeof parseStructTag>,
) {
    const exposedFunctions = Object.entries(normalizedModule.exposedFunctions);

    if (!exposedFunctions.length) return null;

    const functions = [];

    for (const [fnName, normalizedFn] of exposedFunctions) {
        if (!burnKeywordRegex.test(fnName)) {
            continue;
        }

        const moveFnParams = getMoveFunctionParams(normalizedFn);

        if (moveFnParams.length === 1) {
            const param = moveFnParams[0];

            if (typeof param === 'object' && param !== null && 'Struct' in param) {
                const struct = param.Struct;

                const isSamePackage = struct.address === objStruct.address;
                const isSameModule = struct.module === objStruct.module;
                const isSameStruct = struct.name === objStruct.name;

                if (isSamePackage && isSameModule && isSameStruct) {
                    functions.push(fnName);
                }
            }
        }
    }

    return functions;
}
