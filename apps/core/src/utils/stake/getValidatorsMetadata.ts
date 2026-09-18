// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { IotaClient } from '@iota/iota-sdk/client';
import { normalizeIotaAddress } from '@iota/iota-sdk/utils';
import { ValidatorSchema } from '../../types';
import type { IotaValidatorSummaryExtended } from '../../types';
import { bytesToBase64, getMoveFields, MoveStructFields } from './helpers';

/**
 * Fetch the full validator metadata from a validator wrapper object.
 * Handles the Versioned unwrapping common to inactive, pending, and candidate validators.
 */
export async function getValidatorsMetadata(
    client: IotaClient,
    validatorObjectId: string,
): Promise<IotaValidatorSummaryExtended | null> {
    const validatorObject = await client.getObject({
        id: normalizeIotaAddress(validatorObjectId),
        options: {
            showContent: true,
        },
    });
    const validator = ValidatorSchema.safeParse(validatorObject.data?.content);
    const validatorFieldId = validator.data?.fields.value.fields.inner.fields.id.id;
    if (!validatorFieldId) {
        return null;
    }
    const dynamicFields = await client.getDynamicFields({
        parentId: normalizeIotaAddress(validatorFieldId),
        limit: 1,
    });
    const dfObjectId = dynamicFields.data?.[0]?.objectId;
    if (!dfObjectId) {
        return null;
    }
    const dfObject = await client.getObject({
        id: normalizeIotaAddress(dfObjectId),
        options: {
            showContent: true,
        },
    });

    const content = dfObject.data?.content;
    if (!content || content.dataType !== 'moveObject') {
        return null;
    }

    const fields = getMoveFields(content);
    const value = fields.value as MoveStructFields;
    if (!value?.fields) {
        return null;
    }

    const metadata = (value.fields.metadata as MoveStructFields)?.fields || {};
    const stakingPool = (value.fields.staking_pool as MoveStructFields)?.fields || {};
    const exchangeRates = (stakingPool.exchange_rates as MoveStructFields)?.fields || {};

    return {
        authorityPubkeyBytes: bytesToBase64(metadata.authority_pubkey_bytes),
        commissionRate: String(value.fields.commission_rate),
        description: String(metadata.description),
        exchangeRatesId: (exchangeRates.id as { id: string })?.id,
        exchangeRatesSize: String(exchangeRates.size),
        gasPrice: String(value.fields.gas_price),
        imageUrl: String(metadata.image_url),
        iotaAddress: String(metadata.iota_address),
        name: String(metadata.name),
        netAddress: String(metadata.net_address),
        networkPubkeyBytes: bytesToBase64(metadata.network_pubkey_bytes),
        nextEpochCommissionRate: String(value.fields.next_epoch_commission_rate),
        nextEpochGasPrice: String(value.fields.next_epoch_gas_price),
        nextEpochStake: String(value.fields.next_epoch_stake),
        operationCapId: String(value.fields.operation_cap_id),
        p2pAddress: String(metadata.p2p_address),
        pendingPoolTokenWithdraw: String(stakingPool.pending_pool_token_withdraw),
        pendingStake: String(stakingPool.pending_stake),
        pendingTotalIotaWithdraw: String(stakingPool.pending_total_iota_withdraw),
        poolTokenBalance: String(stakingPool.pool_token_balance),
        primaryAddress: String(metadata.primary_address),
        projectUrl: String(metadata.project_url),
        proofOfPossessionBytes: bytesToBase64(metadata.proof_of_possession),
        protocolPubkeyBytes: bytesToBase64(metadata.protocol_pubkey_bytes),
        rewardsPool: String(stakingPool.rewards_pool),
        stakingPoolId: (stakingPool.id as { id: string })?.id,
        stakingPoolIotaBalance: String(stakingPool.iota_balance),
        votingPower: String(value.fields.voting_power),
    };
}
