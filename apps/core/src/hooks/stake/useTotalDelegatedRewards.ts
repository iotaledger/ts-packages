// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react';
import { type ExtendedDelegatedStake } from '../../utils/stake';
import { type ExtendedDelegatedTimelockedStake } from '../../interfaces';

export function useTotalDelegatedRewards(
    delegatedStake: ExtendedDelegatedStake[] | ExtendedDelegatedTimelockedStake[],
) {
    return useMemo(() => {
        if (!delegatedStake) return 0n;
        return delegatedStake.reduce((acc, curr) => {
            if (curr.status === 'Active' && curr.estimatedReward) {
                return acc + BigInt(curr.estimatedReward);
            }
            return acc;
        }, 0n);
    }, [delegatedStake]);
}
