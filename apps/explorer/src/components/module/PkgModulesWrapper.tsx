// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react';

import { useSearchParamsMerged, VerticalList } from '~/components/ui';
import {
    ButtonSegment,
    ButtonSegmentType,
    ButtonUnstyled,
    Divider,
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
    ListItem,
    LoadingIndicator,
    Panel,
    Search,
    type Suggestion,
    Title,
    TitleSize,
} from '@iota/apps-ui-kit';
import { ArrowDown, Warning } from '@iota/apps-ui-icons';
import cx from 'clsx';
import { ModuleCodeTabs } from './ModuleCodeTabs';
import { ModuleFunctionsList } from './ModuleFunctionsList';
import { ModuleStructsList } from './ModuleStructsList';
import { useNormalizedMoveModule } from '~/hooks/useNormalizedMoveModule';

type ModuleType = [moduleName: string, code: string];

interface PkgModulesWrapperProps {
    id: string;
    modules: ModuleType[];
}

export function PkgModulesWrapper({ id, modules }: PkgModulesWrapperProps): JSX.Element {
    const [searchParams, setSearchParams] = useSearchParamsMerged();
    const [query, setQuery] = useState('');

    const moduleNameValue = searchParams.get('module');
    const moduleFromParams = moduleNameValue
        ? modules.find(([moduleName]) => moduleName === moduleNameValue)
        : undefined;

    // Extract module in URL or default to first module in the list
    const [selectedModuleName, selectedModuleCode] = moduleFromParams ?? modules[0];

    // If module in URL exists but is not in module list, then delete module from URL
    useEffect(() => {
        if (!moduleFromParams) {
            setSearchParams({}, { replace: true });
        }
    }, [setSearchParams, moduleFromParams]);

    const moduleNames = modules.map(([name]) => name);
    const filteredModules = query
        ? moduleNames.filter((name) => name.toLowerCase().includes(query.toLowerCase()))
        : [];
    const onChangeModule = (newModule: string) => {
        setSearchParams(
            {
                module: newModule,
            },
            {
                preventScrollReset: true,
            },
        );
    };

    const searchSuggestions: Suggestion[] = filteredModules.map((item) => ({
        id: item,
        label: item,
    }));

    return (
        <div className="flex h-full flex-col items-stretch gap-md--rs md:flex-row md:flex-nowrap">
            <div className="flex w-full flex-col md:min-h-[560px] md:w-1/5">
                <div className="relative z-[1]">
                    <Search
                        searchValue={query}
                        onSearchValueChange={(value) => setQuery(value?.trim() ?? '')}
                        placeholder="Search"
                        isLoading={false}
                        suggestions={searchSuggestions}
                        onSuggestionClick={(suggestion) => {
                            onChangeModule(suggestion.label);
                        }}
                        renderSuggestion={(suggestion) => (
                            <div className="z-10 flex cursor-pointer justify-between">
                                <ListItem
                                    hideBottomBorder
                                    onClick={() => onChangeModule(suggestion.label)}
                                >
                                    <div className="overflow-hidden text-ellipsis">
                                        {suggestion.label}
                                    </div>
                                    <div className="text-caption text-steel break-words pl-xs font-medium uppercase">
                                        {suggestion.type}
                                    </div>
                                </ListItem>
                            </div>
                        )}
                    />
                </div>
                <div className="max-h-[560px] flex-1 overflow-auto pt-sm">
                    <VerticalList>
                        <div className="flex flex-col gap-sm">
                            {moduleNames.map((name) => (
                                <ButtonSegment
                                    key={name}
                                    type={ButtonSegmentType.Underlined}
                                    selected={name === selectedModuleName}
                                    onClick={() => onChangeModule(name)}
                                    label={name}
                                />
                            ))}
                        </div>
                    </VerticalList>
                </div>
            </div>
            <div className="block pt-sm md:hidden">
                <Divider />
            </div>
            <div className="w-full md:w-4/5">
                <ModuleContent
                    packageId={id}
                    moduleName={selectedModuleName}
                    moduleBytecode={selectedModuleCode}
                />
            </div>
        </div>
    );
}

function ModuleContent({
    packageId,
    moduleName,
    moduleBytecode,
}: {
    packageId: string;
    moduleName: string;
    moduleBytecode: string;
}): JSX.Element {
    const {
        data: normalizedModule,
        error,
        isPending,
    } = useNormalizedMoveModule(packageId, moduleName);
    const [isCodeExpanded, setIsCodeExpanded] = useState(false);

    return (
        <div className="flex flex-col gap-md--rs">
            <Panel hasBorder>
                <Title
                    size={TitleSize.Small}
                    title="Bytecode"
                    trailingElement={
                        <ButtonUnstyled
                            className="flex flex-row items-center gap-xxxs pr-md--rs text-label-md text-iota-primary-30 dark:text-iota-primary-80"
                            aria-controls="module-bytecode"
                            aria-expanded={isCodeExpanded}
                            onClick={() => setIsCodeExpanded((expanded) => !expanded)}
                        >
                            {isCodeExpanded ? 'Show Less' : 'Show More'}
                            <ArrowDown
                                className={cx(
                                    'h-4 w-4 transition-transform ease-linear',
                                    isCodeExpanded && 'rotate-180',
                                )}
                            />
                        </ButtonUnstyled>
                    }
                />
                {isCodeExpanded && (
                    <div id="module-bytecode" className="p-md--rs">
                        <ModuleCodeTabs
                            packageId={packageId}
                            moduleName={moduleName}
                            moduleBytecode={moduleBytecode}
                        />
                    </div>
                )}
            </Panel>
            {error ? (
                <InfoBox
                    style={InfoBoxStyle.Elevated}
                    type={InfoBoxType.Error}
                    icon={<Warning />}
                    supportingText={`Error loading module ${moduleName} details.`}
                />
            ) : isPending ? (
                <div className="flex w-full justify-center py-md">
                    <LoadingIndicator />
                </div>
            ) : (
                normalizedModule && (
                    <>
                        <ModuleFunctionsList
                            packageId={packageId}
                            moduleName={moduleName}
                            functions={normalizedModule.exposedFunctions}
                        />
                        <ModuleStructsList
                            packageId={packageId}
                            structs={normalizedModule.structs}
                        />
                    </>
                )
            )}
        </div>
    );
}
