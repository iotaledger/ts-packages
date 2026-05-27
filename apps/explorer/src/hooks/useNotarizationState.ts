// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { encodeB64 } from '@iota/identity-wasm/web';
import type { OnChainNotarization } from '@iota/notarization/web';
import { useMemo } from 'react';
import { replaceJsonKeyValue } from '~/lib';

interface NotarizationState {
    content: string;
    lang: string;
    metadata?: string;
}

export function useNotarizationState(notarization: OnChainNotarization): NotarizationState | null {
    const state = notarization.state;

    const result = useMemo((): [string, string] | null => {
        if (!state) {
            return null;
        }

        let stateContent: string;
        let contentLang = 'text';

        const dataValue = state.data.value;
        if (typeof dataValue !== 'string') {
            // If dataValue is not a string then it is certainly a byte state
            stateContent = encodeB64(state.data.toBytes());
            contentLang = 'text';
        } else {
            // Try to parse the string state as JSON first, otherwise show the string
            try {
                const json = JSON.parse(dataValue);
                stateContent = JSON.stringify(json, replaceJsonKeyValue, 2);
                contentLang = 'json';
            } catch (e) {
                stateContent = dataValue;
                contentLang = 'text';
            }
        }

        return [stateContent, contentLang];
    }, [state]);

    if (!state || !result) {
        return null;
    }

    const [content, lang] = result;

    return {
        content,
        lang,
        metadata: state.metadata,
    };
}
