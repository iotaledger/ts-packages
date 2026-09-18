// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import { useFeature } from '@iota/apps-backend-client';
import { Feature, NoData, DAppListItem, type DAppEntry } from '@iota/core';
import { Panel, Title, TitleSize } from '@iota/apps-ui-kit';

export default function AppsDashboardPage(): React.JSX.Element {
    const ecosystemApps = useFeature<DAppEntry[]>(Feature.WalletDapps).value;

    return (
        <Panel>
            <Title title="IOTA Apps" size={TitleSize.Medium} />
            <div className="px-lg py-sm">
                {ecosystemApps?.length ? (
                    <div className="grid auto-rows-fr grid-cols-2 items-stretch gap-md">
                        {ecosystemApps.map((app) => {
                            let appUrl: string;
                            try {
                                appUrl = new URL(app.link).toString();
                            } catch {
                                appUrl = app.link;
                            }
                            return (
                                <a
                                    key={app.link}
                                    href={appUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block h-full no-underline"
                                >
                                    <div className="h-full [&>div]:h-full">
                                        <DAppListItem
                                            name={app.name}
                                            icon={app.icon}
                                            description={app.description}
                                            tags={app.tags}
                                            link={app.link}
                                        />
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-2xl">
                        <NoData message="No apps found." />
                    </div>
                )}
            </div>
        </Panel>
    );
}
