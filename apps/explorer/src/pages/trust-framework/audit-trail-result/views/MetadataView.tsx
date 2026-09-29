// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type OnChainAuditTrail } from '@iota/audit-trails/web';
import { SyntaxHighlighter } from '~/components';

interface MetadataViewProps {
    auditTrail: OnChainAuditTrail;
}

export function MetadataView({ auditTrail }: MetadataViewProps) {
    const { immutableMetadata, updatableMetadata } = auditTrail;

    return (
        <div className="flex flex-col gap-y-md">
            <div className="flex flex-col">
                <SyntaxHighlighter code={updatableMetadata ?? ''} language="text" />
                <span className="mt-1 text-body-sm text-gray-500 dark:text-gray-400">
                    Updatable Metadata (Text)
                </span>
            </div>
            <div className="flex flex-col">
                <SyntaxHighlighter code={immutableMetadata?.name ?? ''} language="text" />
                <span className="mt-1 text-body-sm text-gray-500 dark:text-gray-400">
                    Name (Text)
                </span>
            </div>
            <div className="flex flex-col">
                <SyntaxHighlighter code={immutableMetadata?.description ?? ''} language="text" />
                <span className="mt-1 text-body-sm text-gray-500 dark:text-gray-400">
                    Description (Text)
                </span>
            </div>
        </div>
    );
}
