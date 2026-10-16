// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { toast } from '@iota/core';
import { useState } from 'react';

const AUTO_REFRESH_TOAST_ID = 'auto-refresh';
export const AUTO_REFRESH_INTERVAL_SECONDS = 10;
export const AUTO_REFRESH_INTERVAL = AUTO_REFRESH_INTERVAL_SECONDS * 1000;

export function useAutoRefresh() {
    const [paused, setPaused] = useState(false);

    const togglePaused = () => {
        toast(
            paused
                ? `Auto-refreshing on - every ${AUTO_REFRESH_INTERVAL_SECONDS} seconds`
                : 'Auto-refresh paused',
            { id: AUTO_REFRESH_TOAST_ID },
        );
        setPaused(!paused);
    };

    return { paused, togglePaused };
}
