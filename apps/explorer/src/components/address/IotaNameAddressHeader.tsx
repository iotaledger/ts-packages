// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Badge, BadgeSize, BadgeType } from '@iota/apps-ui-kit';

interface IotaNameAddressHeaderProps {
    name: string;
}

export function IotaNameAddressHeader({ name }: IotaNameAddressHeaderProps): JSX.Element {
    return (
        <div className="flex flex-row flex-wrap items-center gap-x-sm gap-y-xs">
            <span className="break-all text-headline-sm text-iota-neutral-10 dark:text-iota-neutral-92">
                {name}
            </span>
            <Badge type={BadgeType.Neutral} label="IOTA Name" size={BadgeSize.Small} />
        </div>
    );
}
