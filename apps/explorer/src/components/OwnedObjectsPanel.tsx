// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Divider, Panel, Title } from '@iota/apps-ui-kit';
import { ErrorBoundary } from './error-boundary';
import { OwnedCoins } from './owned-coins';
import { OwnedObjects } from './owned-objects';
import { SplitPanes } from './ui';
import { useBreakpoint } from '~/hooks/useBreakpoint';
import { LocalStorageSplitPaneKey } from '~/lib/enums';

const LEFT_RIGHT_PANEL_MIN_SIZE = 30;

export function OwnedObjectsPanel({ address }: { address: string }): JSX.Element {
    const isMediumOrAbove = useBreakpoint('md');

    const leftPane = {
        panel: <OwnedCoins id={address} />,
        minSize: LEFT_RIGHT_PANEL_MIN_SIZE,
        defaultSize: LEFT_RIGHT_PANEL_MIN_SIZE,
    };

    const rightPane = {
        panel: <OwnedObjects id={address} />,
        minSize: LEFT_RIGHT_PANEL_MIN_SIZE,
    };

    return (
        <Panel>
            <Title title="Owned Objects" />
            <Divider />
            <div className="flex flex-col gap-2xl">
                <div className="flex flex-col justify-between">
                    <ErrorBoundary>
                        {isMediumOrAbove ? (
                            <SplitPanes
                                autoSaveId={LocalStorageSplitPaneKey.AddressViewHorizontal}
                                dividerSize="none"
                                splitPanels={[leftPane, rightPane]}
                                direction="horizontal"
                            />
                        ) : (
                            <>
                                {leftPane.panel}
                                <div className="my-8">
                                    <Divider />
                                </div>
                                {rightPane.panel}
                            </>
                        )}
                    </ErrorBoundary>
                </div>
            </div>
        </Panel>
    );
}

export function OwnedObjectsSection({ address }: { address: string }): JSX.Element {
    return (
        <Panel>
            <Title title="Owned Objects" />
            <Divider />
            <div className="flex flex-col gap-2xl">
                <OwnedObjectsPanel address={address} />
            </div>
        </Panel>
    );
}
