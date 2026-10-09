// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClient } from '@iota/dapp-kit';
import {
    IotaClient,
    IotaMoveNormalizedStruct,
    IotaMoveObject,
    IotaObjectData,
} from '@iota/iota-sdk/client';
import { Transaction } from '@iota/iota-sdk/transactions';
import { parseStructTag } from '@iota/iota-sdk/utils';
import { useQuery, skipToken } from '@tanstack/react-query';
import { getBurnFunctionCandidates } from '../utils/getBurnFunctionCandidates';

function getMoveObjectContent(obj: IotaObjectData | null | undefined): IotaMoveObject | null {
    if (!obj?.content || obj?.content?.dataType === 'package') {
        return null;
    }

    return obj.content;
}

export function useIsAssetTransferable(obj: IotaObjectData | null | undefined) {
    const client = useIotaClient();
    const objContent = getMoveObjectContent(obj);

    return useQuery({
        // eslint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['is-asset-transferable', objContent],
        queryFn: objContent
            ? async () => {
                  const { address, module, name } = parseStructTag(objContent.type);

                  if (!address || !module || !name) {
                      return undefined;
                  }

                  return await client.getNormalizedMoveStruct({
                      package: address,
                      module,
                      struct: name,
                  });
              }
            : skipToken,
        select: (moveNormalizedStruct: IotaMoveNormalizedStruct | undefined): boolean => {
            if (!moveNormalizedStruct) {
                return false;
            }

            const structAbilities = moveNormalizedStruct?.abilities?.abilities ?? null;

            if (!structAbilities) {
                return false;
            }

            return structAbilities.includes('Store');
        },
    });
}

export function useGetNFTBurnFunction(
    obj: IotaObjectData | null | undefined,
    currentAddress: string | null,
) {
    const client = useIotaClient();
    const objContent = getMoveObjectContent(obj);

    const isEnabled = !!objContent && !!currentAddress && !!obj?.objectId;

    return useQuery({
        // eslint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['is-asset-burnable', objContent],
        queryFn: isEnabled
            ? async () => {
                  const objectStruct = parseStructTag(objContent.type);

                  if (!objectStruct.address || !objectStruct.module) {
                      return null;
                  }

                  const normalizedModule = await client.getNormalizedMoveModule({
                      package: objectStruct.address,
                      module: objectStruct.module,
                  });

                  const possibleBurnFunctions = getBurnFunctionCandidates(
                      normalizedModule,
                      objectStruct,
                  );

                  if (!possibleBurnFunctions || possibleBurnFunctions.length === 0) {
                      return null;
                  }

                  for (const fnName of possibleBurnFunctions) {
                      const target = `${objectStruct.address}::${objectStruct.module}::${fnName}`;

                      const isBurnSuccess = await getIsTxBurnSuccess(
                          client,
                          currentAddress,
                          target,
                          obj.objectId,
                      );

                      if (isBurnSuccess) return target;
                  }

                  return null;
              }
            : skipToken,
    });
}

async function getIsTxBurnSuccess(
    client: IotaClient,
    currentAddress: string,
    target: string,
    objectId: string,
): Promise<boolean> {
    try {
        const tx = new Transaction();

        tx.moveCall({
            target,
            arguments: [tx.object(objectId)],
        });

        const { effects } = await client.devInspectTransactionBlock({
            transactionBlock: tx,
            sender: currentAddress,
            additionalArgs: { skipChecks: false },
        });

        const success = effects?.status?.status === 'success';

        if (!success) return false;

        const objectDeleted = effects.deleted?.some((ref) => ref.objectId === objectId) || false;

        return objectDeleted;
    } catch (e) {
        console.error('Error trying to burn object:', e);
        return false;
    }
}
