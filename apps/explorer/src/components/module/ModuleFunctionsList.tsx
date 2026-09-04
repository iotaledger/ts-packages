// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    Badge,
    BadgeSize,
    BadgeType,
    ButtonSegment,
    ButtonSegmentType,
    ButtonUnstyled,
    Panel,
    SegmentedButton,
    SegmentedButtonType,
    Title,
    TitleSize,
    Tooltip,
    TooltipPosition,
} from '@iota/apps-ui-kit';
import { ArrowDown } from '@iota/apps-ui-icons';
import { type IotaMoveNormalizedFunction, type IotaMoveVisibility } from '@iota/iota-sdk/client';
import cx from 'clsx';
import { useState } from 'react';
import { formatMoveType, getTypeParameterNames } from '~/lib/ui';
import { ModuleFunctionForm } from './module-functions-interaction';

interface ModuleFunctionsListProps {
    packageId: string;
    moduleName: string;
    functions: Record<string, IotaMoveNormalizedFunction>;
}

const VISIBILITY_BADGE_TYPE: Record<IotaMoveVisibility, BadgeType> = {
    Public: BadgeType.PrimarySoft,
    Friend: BadgeType.Neutral,
    Private: BadgeType.Outlined,
};

function formatSignature(functionDetails: IotaMoveNormalizedFunction, packageId: string) {
    const typeParameterNames = getTypeParameterNames(functionDetails.typeParameters.length);
    const format = (type: Parameters<typeof formatMoveType>[0]) =>
        formatMoveType(type, packageId, typeParameterNames);

    return {
        args: functionDetails.parameters.map(format).join(', '),
        returns: functionDetails.return.map(format).join(', '),
    };
}

enum FunctionsTab {
    All = 'all',
    Execute = 'execute',
}

export function ModuleFunctionsList({
    packageId,
    moduleName,
    functions,
}: ModuleFunctionsListProps): JSX.Element | null {
    const [openFunctionName, setOpenFunctionName] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<FunctionsTab>(FunctionsTab.All);

    const allEntries = Object.entries(functions);
    const executableEntries = allEntries.filter(([, details]) => details.isEntry);
    const entries = activeTab === FunctionsTab.Execute ? executableEntries : allEntries;

    const tabs = [
        { label: `All (${allEntries.length})`, value: FunctionsTab.All },
        {
            label: `Execute (${executableEntries.length})`,
            value: FunctionsTab.Execute,
            disabled: !executableEntries.length,
            disabledTooltip: 'This module has no functions that can be executed from here.',
        },
    ];

    if (!allEntries.length) {
        return null;
    }

    return (
        <Panel hasBorder>
            <Title size={TitleSize.Small} title="Functions" />
            <div>
                <SegmentedButton
                    type={SegmentedButtonType.Transparent}
                    shape={ButtonSegmentType.Underlined}
                >
                    {tabs.map(({ label, value, disabled, disabledTooltip }) => {
                        const segment = (
                            <ButtonSegment
                                key={value}
                                type={ButtonSegmentType.Underlined}
                                isNested
                                label={label}
                                selected={activeTab === value}
                                disabled={disabled}
                                onClick={() => setActiveTab(value)}
                            />
                        );

                        if (!disabled || !disabledTooltip) {
                            return segment;
                        }

                        // A disabled button swallows hover events, so the
                        // tooltip is triggered by its wrapper instead.
                        return (
                            <Tooltip
                                key={value}
                                text={disabledTooltip}
                                position={TooltipPosition.Bottom}
                            >
                                <div className="[&>button]:pointer-events-none">{segment}</div>
                            </Tooltip>
                        );
                    })}
                </SegmentedButton>
            </div>
            <div className="flex flex-col gap-md px-md pb-md pt-md">
                {entries.map(([functionName, functionDetails]) => {
                    const { args, returns } = formatSignature(functionDetails, packageId);
                    const isOpen = openFunctionName === functionName;
                    const formId = `run-${moduleName}-${functionName}`;

                    return (
                        <div
                            key={functionName}
                            className="flex flex-col gap-xxs rounded-xl border border-shader-neutral-light-8 p-md dark:border-shader-neutral-dark-8"
                        >
                            <div className="flex flex-row flex-wrap items-center gap-xs">
                                <Badge
                                    type={VISIBILITY_BADGE_TYPE[functionDetails.visibility]}
                                    size={BadgeSize.Small}
                                    label={functionDetails.visibility.toLowerCase()}
                                />
                                <span className="text-title-sm text-iota-neutral-10 dark:text-iota-neutral-92">
                                    {functionName}
                                </span>

                                {functionDetails.isEntry && (
                                    <div className="ml-auto">
                                        <ButtonUnstyled
                                            className="flex flex-row items-center gap-xxxs text-label-md text-iota-primary-30 dark:text-iota-primary-80"
                                            aria-controls={formId}
                                            aria-expanded={isOpen}
                                            onClick={() =>
                                                setOpenFunctionName(isOpen ? null : functionName)
                                            }
                                        >
                                            Run
                                            <ArrowDown
                                                className={cx(
                                                    'h-4 w-4 transition-transform ease-linear',
                                                    isOpen && 'rotate-180',
                                                )}
                                            />
                                        </ButtonUnstyled>
                                    </div>
                                )}
                            </div>

                            <dl className="flex flex-col gap-xxs text-body-sm">
                                <div className="flex flex-row flex-wrap gap-xs">
                                    <dt className="shrink-0 text-iota-neutral-60 dark:text-iota-neutral-40">
                                        args
                                    </dt>
                                    {/* Breaking on words keeps the wrap
                                            between parameters, not inside a type. */}
                                    <dd className="min-w-0 break-words text-iota-neutral-40 dark:text-iota-neutral-60">
                                        ({args})
                                    </dd>
                                </div>
                                {!!returns && (
                                    <div className="flex flex-row flex-wrap gap-xs">
                                        <dt className="shrink-0 text-iota-neutral-60 dark:text-iota-neutral-40">
                                            returns
                                        </dt>
                                        <dd className="min-w-0 break-words text-iota-neutral-40 dark:text-iota-neutral-60">
                                            {returns}
                                        </dd>
                                    </div>
                                )}
                            </dl>

                            {isOpen && (
                                <div id={formId}>
                                    <ModuleFunctionForm
                                        packageId={packageId}
                                        moduleName={moduleName}
                                        functionName={functionName}
                                        functionDetails={functionDetails}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </Panel>
    );
}
