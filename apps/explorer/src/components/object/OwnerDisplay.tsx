// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Badge, BadgeSize, BadgeType } from '@iota/apps-ui-kit';
import { type ObjectOwner } from '@iota/iota-sdk/client';
import { type ReactNode } from 'react';
import { AddressLink, ObjectLink } from '~/components/ui';

export function OwnerDisplay({ objOwner }: { objOwner: ObjectOwner }): ReactNode {
    if (objOwner === 'Immutable') {
        return <Badge type={BadgeType.Neutral} size={BadgeSize.Small} label="Immutable" />;
    }

    if ('Shared' in objOwner) {
        return (
            <div className="flex flex-row flex-wrap items-center gap-xs">
                <Badge type={BadgeType.PrimarySoft} size={BadgeSize.Small} label="Shared" />
                <span className="text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                    since version {objOwner.Shared.initial_shared_version}
                </span>
            </div>
        );
    }

    if ('ObjectOwner' in objOwner) {
        return (
            <div className="flex flex-row flex-wrap items-start gap-xs">
                <ObjectLink objectId={objOwner.ObjectOwner} copyText={objOwner.ObjectOwner} />
                <Badge type={BadgeType.Outlined} size={BadgeSize.Small} label="Object" />
            </div>
        );
    }

    return (
        <div className="flex flex-row flex-wrap items-start gap-xs">
            <AddressLink address={objOwner.AddressOwner} copyText={objOwner.AddressOwner} />
            <Badge type={BadgeType.Outlined} size={BadgeSize.Small} label="Address" />
        </div>
    );
}
