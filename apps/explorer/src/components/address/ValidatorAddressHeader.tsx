// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Badge, BadgeSize, BadgeType } from '@iota/apps-ui-kit';
import type { IotaValidatorSummary } from '@iota/iota-sdk/client';
import { ValidatorLink } from '~/components/ui';

interface ValidatorAddressHeaderProps {
    validator: IotaValidatorSummary;
}

export function ValidatorAddressHeader({ validator }: ValidatorAddressHeaderProps): JSX.Element {
    return (
        <div className="flex flex-row items-center gap-x-sm">
            <ValidatorLink
                address={validator.iotaAddress}
                showAddressAlias={false}
                label={
                    <span className="text-headline-sm text-iota-neutral-10 dark:text-iota-neutral-92">
                        {validator.name}
                    </span>
                }
            />
            <Badge type={BadgeType.Neutral} label="Validator" size={BadgeSize.Small} />
        </div>
    );
}
