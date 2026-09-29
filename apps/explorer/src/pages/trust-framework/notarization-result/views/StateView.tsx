// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type OnChainNotarization } from '@iota/notarization/web';
import { SyntaxHighlighter } from '~/components';
import { useNotarizationState } from '~/hooks/useNotarizationState';

interface StateViewProps {
    notarization: OnChainNotarization;
}

export function StateView({ notarization }: StateViewProps) {
    const data = useNotarizationState(notarization);

    if (!data) {
        return null;
    }

    const { content, lang, metadata } = data;
    return (
        <div className="flex flex-col gap-y-md">
            <div className="flex flex-col">
                <SyntaxHighlighter code={content} language={lang} />
                <span className="mt-1 text-body-sm text-gray-500 dark:text-gray-400">
                    {lang === 'json' ? 'State (JSON)' : 'State (Text)'}
                </span>
            </div>
            {metadata && (
                <div className="flex flex-col">
                    <SyntaxHighlighter code={metadata} language="text" />
                    <span className="mt-1 text-body-sm text-gray-500 dark:text-gray-400">
                        Metadata (Text)
                    </span>
                </div>
            )}
        </div>
    );
}
