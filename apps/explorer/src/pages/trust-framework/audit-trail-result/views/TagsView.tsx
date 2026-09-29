// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type RecordTagEntry } from '@iota/audit-trails/web';
import { KeyValueInfo, InfoBox, InfoBoxType, InfoBoxStyle } from '@iota/apps-ui-kit';
import { Info } from '@iota/apps-ui-icons';

interface TagsCardProps {
    tags: RecordTagEntry[];
}

export function TagsView({ tags }: TagsCardProps) {
    return (
        <>
            {tags.length === 0 ? (
                <InfoBox
                    title="No tags found"
                    supportingText="This audit trail has no tags configured."
                    type={InfoBoxType.Default}
                    style={InfoBoxStyle.Elevated}
                    icon={<Info />}
                />
            ) : (
                <div className="flex max-h-44 flex-col gap-xs overflow-y-auto md:max-h-96">
                    {tags.map(({ tag, usageCount }) => (
                        <div key={tag}>
                            <KeyValueInfo keyText={tag} value={usageCount.toString()} fullwidth />
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
