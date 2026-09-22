// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ButtonUnstyled } from '@iota/apps-ui-kit';
import { Copy } from '@iota/apps-ui-icons';

export function CopyButton({
    text,
    onCopySuccess,
}: {
    text: string;
    onCopySuccess?: (event: React.MouseEvent<HTMLButtonElement>, text: string) => void;
}): JSX.Element {
    async function handleCopyClick(event: React.MouseEvent<HTMLButtonElement>) {
        if (!navigator.clipboard) {
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            onCopySuccess?.(event, text);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    }

    return (
        <ButtonUnstyled
            onClick={handleCopyClick}
            aria-label="Copy to clipboard"
            className="shrink-0"
        >
            <Copy className="key-supporting-text-color" />
        </ButtonUnstyled>
    );
}
