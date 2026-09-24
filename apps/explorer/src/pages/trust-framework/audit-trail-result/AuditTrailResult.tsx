// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { InfoBox, InfoBoxStyle, InfoBoxType } from '@iota/apps-ui-kit';
import { useParams } from 'react-router-dom';
import { PageLayout } from '~/components';
import { Warning } from '@iota/apps-ui-icons';
import { AuditTrailContent } from './AuditTrailContent';

export function AuditTrailResult() {
    const { id: auditTrailId } = useParams();

    if (!auditTrailId) {
        return (
            <PageLayout
                content={
                    <InfoBox
                        title="Missing Audit Trail ID"
                        supportingText="The path is missing an Audit Trail ID to parse."
                        icon={<Warning />}
                        type={InfoBoxType.Error}
                        style={InfoBoxStyle.Elevated}
                    />
                }
            />
        );
    }

    return <AuditTrailContent objectId={auditTrailId} />;
}
