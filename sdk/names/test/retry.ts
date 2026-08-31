// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

// This file is duplicated in apps/evm-bridge/tests/utils/retry.ts and sdk/isc-sdk/tests/retry.ts;
// update every copy, including these paths, when changing it.

interface RetryUntilOptions<T> {
    until: (result: T) => boolean;
    timeoutMs: number;
    delayMs: number;
    maxDelayMs: number;
    onRetry?: (message: string) => void;
}

export async function retryUntil<T>(
    operation: () => Promise<T>,
    { until, timeoutMs, delayMs, maxDelayMs, onRetry }: RetryUntilOptions<T>,
): Promise<T> {
    const deadline = Date.now() + timeoutMs;
    let lastError: unknown;

    for (let attempt = 1; ; attempt++) {
        try {
            const result = await operation();
            if (until(result)) {
                return result;
            }
            lastError = undefined;
            onRetry?.('condition not met yet');
        } catch (error) {
            lastError = error;
            onRetry?.((error as Error).message);
        }

        const remainingMs = deadline - Date.now();
        if (remainingMs <= 0) {
            throw new Error(`Gave up after ${attempt} attempts in ${timeoutMs} ms.`, {
                cause: lastError,
            });
        }

        await new Promise((resolve) =>
            setTimeout(resolve, Math.min(attempt * delayMs, maxDelayMs, remainingMs)),
        );
    }
}
