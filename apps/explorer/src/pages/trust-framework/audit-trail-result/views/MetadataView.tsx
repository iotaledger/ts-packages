// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type OnChainAuditTrail } from '@iota/audit-trails/web';
import { SyntaxHighlighter } from '~/components';

interface MetadataViewProps {
    auditTrail: OnChainAuditTrail;
}

interface LabelledSyntaxHighlighterProps {
    label: string;
    code: string;
    language: string;
}

function LabelledSyntaxHighlighter({ label, code, language }: LabelledSyntaxHighlighterProps) {
    return (
        <div className="flex flex-col">
            <SyntaxHighlighter code={code} language={language} />
            <span className="mt-1 text-body-sm text-gray-500 dark:text-gray-400">{label}</span>
        </div>
    );
}

export function MetadataView({ auditTrail }: MetadataViewProps) {
    const { immutableMetadata, updatableMetadata } = auditTrail;

    return (
        <div className="flex flex-col gap-y-md">
            <LabelledSyntaxHighlighter
                label="Updatable Metadata (Text)"
                code={updatableMetadata ?? ''}
                language="text"
            />
            <LabelledSyntaxHighlighter
                label="Name (Text)"
                code={immutableMetadata?.name ?? ''}
                language="text"
            />
            <LabelledSyntaxHighlighter
                label="Description (Text)"
                code={immutableMetadata?.description ?? ''}
                language="text"
            />
        </div>
    );
}
