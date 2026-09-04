// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Badge, BadgeSize, BadgeType, Panel, Title, TitleSize } from '@iota/apps-ui-kit';
import { type IotaMoveNormalizedStruct } from '@iota/iota-sdk/client';
import { formatMoveType, getTypeParameterNames } from '~/lib/ui';

interface ModuleStructsListProps {
    packageId: string;
    structs: Record<string, IotaMoveNormalizedStruct>;
}

export function ModuleStructsList({
    packageId,
    structs,
}: ModuleStructsListProps): JSX.Element | null {
    const entries = Object.entries(structs);

    if (!entries.length) {
        return null;
    }

    return (
        <Panel hasBorder>
            <Title
                size={TitleSize.Small}
                title="Structs"
                supportingElement={
                    <span className="text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                        {entries.length} {entries.length === 1 ? 'type' : 'types'}
                    </span>
                }
            />
            <div className="flex flex-col gap-md px-md pb-md">
                {entries.map(([structName, structDetails]) => {
                    const typeParameterNames = getTypeParameterNames(
                        structDetails.typeParameters.length,
                    );

                    return (
                        <div
                            key={structName}
                            className="flex flex-col gap-xxs rounded-xl border border-shader-neutral-light-8 p-md dark:border-shader-neutral-dark-8"
                        >
                            <div className="flex flex-row flex-wrap items-center gap-xs">
                                <span className="text-title-sm text-iota-neutral-10 dark:text-iota-neutral-92">
                                    {structName}
                                </span>
                                {structDetails.abilities.abilities.map((ability) => (
                                    <Badge
                                        key={ability}
                                        type={BadgeType.Outlined}
                                        size={BadgeSize.Small}
                                        label={ability.toLowerCase()}
                                    />
                                ))}
                            </div>

                            <dl className="flex flex-col gap-xxs text-body-sm">
                                {structDetails.fields.map((field) => (
                                    <div
                                        key={field.name}
                                        className="flex flex-row flex-wrap gap-xs"
                                    >
                                        <dt className="shrink-0 text-iota-neutral-10 dark:text-iota-neutral-92">
                                            {field.name}:
                                        </dt>
                                        <dd className="min-w-0 break-words text-iota-neutral-40 dark:text-iota-neutral-60">
                                            {formatMoveType(
                                                field.type,
                                                packageId,
                                                typeParameterNames,
                                            )}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    );
                })}
            </div>
        </Panel>
    );
}
