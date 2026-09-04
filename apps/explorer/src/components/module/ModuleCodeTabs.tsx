// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ModuleView } from './ModuleView';
import { useVerifiedSourceCode } from '~/hooks/useVerifiedSourceCode';
import {
    ButtonSegment,
    ButtonSegmentType,
    SegmentedButton,
    SegmentedButtonType,
} from '@iota/apps-ui-kit';
import { TabbedContentWrapper, ListTabContent } from './TabbedContentWrapper';
import { TabsProvider, TabSelector } from '../tabs';

type ModuleCodeTabsProps = {
    packageId: string;
    moduleName: string;
    moduleBytecode: string;
};
interface TabItem {
    id: string;
    label: string;
    hidden?: boolean;
}

export function ModuleCodeTabs({
    packageId,
    moduleName,
    moduleBytecode,
}: ModuleCodeTabsProps): React.JSX.Element {
    const { data: verifiedSourceCode } = useVerifiedSourceCode({
        packageId,
        moduleName,
    });

    const bytecodeTab: TabItem = {
        id: 'bytecode',
        label: 'Bytecode',
    };

    const sourceTab: TabItem = {
        id: 'source',
        label: 'Source Verified',
        hidden: !verifiedSourceCode,
    };

    const TABS: TabItem[] = [bytecodeTab, sourceTab];
    const visibleTabs = TABS.filter(({ hidden }) => !hidden);

    // Verified sources come from a service that is not always available, so the
    // selector only earns its place once there is something to select between.
    if (visibleTabs.length < 2) {
        return (
            <div className="max-h-[560px] overflow-auto">
                <ModuleView id={packageId} name={moduleName} code={moduleBytecode} />
            </div>
        );
    }

    return (
        <TabbedContentWrapper>
            <TabsProvider tabs={TABS}>
                <TabSelector>
                    {(selectedTabId, setSelectedTabId) => (
                        <SegmentedButton
                            type={SegmentedButtonType.Transparent}
                            shape={ButtonSegmentType.Underlined}
                        >
                            {visibleTabs.map(({ id, label }) => (
                                <ButtonSegment
                                    key={id}
                                    type={ButtonSegmentType.Underlined}
                                    onClick={() => setSelectedTabId(id)}
                                    label={label}
                                    selected={selectedTabId === id}
                                />
                            ))}
                        </SegmentedButton>
                    )}
                </TabSelector>

                <ListTabContent id={bytecodeTab.id}>
                    <div className="max-h-[560px]">
                        <ModuleView id={packageId} name={moduleName} code={moduleBytecode} />
                    </div>
                </ListTabContent>

                {verifiedSourceCode && (
                    <ListTabContent id={sourceTab.id}>
                        <div className="max-h-[560px]">
                            <ModuleView
                                id={packageId}
                                name={moduleName}
                                code={verifiedSourceCode}
                            />
                        </div>
                    </ListTabContent>
                )}
            </TabsProvider>
        </TabbedContentWrapper>
    );
}
