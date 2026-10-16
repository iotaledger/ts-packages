// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useCallback, type MouseEventHandler } from 'react';
import { useCopyToClipboard as useCopyToClipboardCore } from '@iota/core';

export type CopyOptions = {
    copySuccessMessage?: string;
};

export function useCopyToClipboard(
    textToCopy: string,
    { copySuccessMessage = 'Copied' }: CopyOptions,
) {
    const copyToClipboardCore = useCopyToClipboardCore(undefined, copySuccessMessage);

    return useCallback<MouseEventHandler>(
        async (e) => {
            e.stopPropagation();
            e.preventDefault();
            await copyToClipboardCore(textToCopy);
        },
        [textToCopy, copyToClipboardCore],
    );
}
