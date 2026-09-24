// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { SyntaxHighlighter } from '~/components';
import { CopyButton } from './programmable-transaction-view/Field';

export function JsonPanel({ data }: { data: unknown }): JSX.Element {
    const code = JSON.stringify(data, null, 2);

    return (
        <div className="relative w-0 min-w-full">
            <div className="absolute right-sm top-sm z-10">
                <CopyButton text={code} />
            </div>
            <SyntaxHighlighter code={code} language="json" />
        </div>
    );
}
