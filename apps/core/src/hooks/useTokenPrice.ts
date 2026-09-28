// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';

import { useAppsBackendClient } from '@iota/apps-backend-client';
import { useCoinMetadata } from './useFormatCoin';
import { Feature } from '../enums';
import { Network } from '@iota/iota-sdk/client';
import { useFeatureEnabledByNetwork } from './useFeatureEnabledByNetwork';
import { useCoinRegistryEntry } from './useCoinRegistry';

export function useTokenPrice(priceId: string | null, network: Network) {
    const client = useAppsBackendClient();
    const isFiatConversionEnabled = useFeatureEnabledByNetwork(Feature.FiatConversion, network);
    return useQuery({
        queryKey: ['apps-backend', 'token-price', isFiatConversionEnabled, network, priceId],
        queryFn: () => {
            if (!isFiatConversionEnabled || !priceId) return { price: null };
            return client.getCoinPrice(priceId);
        },

        // These values are set to one minute to prevent displaying stale data, as token prices can change frequently.
        staleTime: 60 * 1000,
        gcTime: 60 * 1000,
    });
}

export function useCoinFiatValue(
    coinType: string,
    amount: bigint | string | number,
    network: Network,
): number | null {
    const entry = useCoinRegistryEntry(coinType);
    const { data: coinMetadata } = useCoinMetadata(coinType);

    const valuation = entry?.valuation;
    const priceId = valuation?.kind === 'market' ? valuation.priceId : null;
    const { data: tokenPrice } = useTokenPrice(priceId, network);

    const unitPrice = valuation?.kind === 'peg' ? valuation.rate : tokenPrice?.price;
    if (!unitPrice || !coinMetadata) return null;

    return new BigNumber(amount.toString())
        .shiftedBy(-coinMetadata.decimals)
        .multipliedBy(unitPrice)
        .toNumber();
}
