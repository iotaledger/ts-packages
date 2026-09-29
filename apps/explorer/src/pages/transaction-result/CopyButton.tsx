// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ButtonUnstyled } from '@iota/apps-ui-kit';
import { Copy } from '@iota/apps-ui-icons';
import { useCopyToClipboard } from '@iota/core';

export function CopyButton({ text }: { text: string }): JSX.Element {
    const copyToClipboard = useCopyToClipboard();

    return (
        <ButtonUnstyled
            onClick={() => copyToClipboard(text)}
            aria-label="Copy to clipboard"
            className="shrink-0"
        >
            <Copy className="key-supporting-text-color" />
        </ButtonUnstyled>
    );
}
