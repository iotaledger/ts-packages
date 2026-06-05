// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { InfoBox, InfoBoxStyle, InfoBoxType } from '@iota/apps-ui-kit';
import { useParams } from 'react-router-dom';
import { PageLayout } from '~/components';
import { Warning } from '@iota/apps-ui-icons';
import { NotarizationContent } from './NotarizationContent';

export function NotarizationResult() {
    const { id: notarizationId } = useParams();

    if (notarizationId == null) {
        return (
            <PageLayout
                content={
                    <InfoBox
                        title="Missing Notarization ID"
                        supportingText="The path is missing a Notarization ID to parse."
                        icon={<Warning />}
                        type={InfoBoxType.Error}
                        style={InfoBoxStyle.Elevated}
                    />
                }
            />
        );
    }

    return <NotarizationContent objectId={notarizationId} />;
}
