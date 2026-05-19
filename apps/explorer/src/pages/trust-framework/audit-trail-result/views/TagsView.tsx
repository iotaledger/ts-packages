// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type RecordTagEntry } from '@iota/audit-trail';
import {
    Panel,
    Title,
    KeyValueInfo,
    ButtonUnstyled,
    InfoBox,
    InfoBoxType,
    InfoBoxStyle,
} from '@iota/apps-ui-kit';
import { Info } from '@iota/apps-ui-icons';

interface TagsCardProps {
    tags: RecordTagEntry[];
    onFieldsNameClick?: (tag: string) => void;
}

export function TagsView({ tags, onFieldsNameClick }: TagsCardProps) {
    return (
        <Panel>
            <div className="flex flex-col gap-md p-xs">
                <div className="flex w-full flex-col justify-between gap-xxs p-md--rs sm:flex-row md:items-center">
                    <Title title="Tags" />
                </div>
                {tags.length === 0 ? (
                    <div className="p-md--rs pt-0">
                        <InfoBox
                            title="No tags found"
                            supportingText="This audit trail has no tags configured."
                            type={InfoBoxType.Default}
                            style={InfoBoxStyle.Elevated}
                            icon={<Info />}
                        />
                    </div>
                ) : (
                    <div className="flex max-h-44 flex-col overflow-y-auto md:max-h-96">
                        {tags.map(({ tag, usageCount }) => (
                            <ButtonUnstyled
                                key={tag}
                                className="rounded-lg p-xs hover:bg-iota-primary-80/20"
                                onClick={() => onFieldsNameClick && onFieldsNameClick(tag)}
                            >
                                <KeyValueInfo
                                    keyText={tag}
                                    value={usageCount.toString()}
                                    fullwidth
                                />
                            </ButtonUnstyled>
                        ))}
                    </div>
                )}
            </div>
        </Panel>
    );
}
