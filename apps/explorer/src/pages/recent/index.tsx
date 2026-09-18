// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ACTIVITY_CATEGORIES, Activity, ErrorBoundary, PageLayout } from '~/components';
import { useSearchParamsMerged } from '~/components/ui';

const TRANSACTIONS_LIMIT = 20;

function getCategoryLabel(tab: string | null): string {
    return (
        ACTIVITY_CATEGORIES.find(({ value }) => value === tab)?.label ??
        ACTIVITY_CATEGORIES[0].label
    );
}

export function Recent(): JSX.Element {
    const [searchParams, setSearchParams] = useSearchParamsMerged();
    const selectedTab = searchParams.get('tab');

    return (
        <PageLayout
            content={
                <div
                    data-testid="transaction-page"
                    id="transaction"
                    className="mx-auto flex flex-col gap-xl"
                >
                    <div className="pt-md--rs text-display-sm text-iota-neutral-10 dark:text-iota-neutral-92">
                        {getCategoryLabel(selectedTab)}
                    </div>
                    <ErrorBoundary>
                        <Activity
                            initialLimit={TRANSACTIONS_LIMIT}
                            initialTab={selectedTab}
                            onCategoryChange={(category) => setSearchParams({ tab: category })}
                        />
                    </ErrorBoundary>
                </div>
            }
        />
    );
}
