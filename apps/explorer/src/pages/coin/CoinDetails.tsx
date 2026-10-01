// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useParams } from 'react-router-dom';
import { CoinMeta, PageLayout } from '~/components';
import { normalizeStructTag } from '@iota/iota-sdk/utils';
import { LoadingIndicator, Panel } from '@iota/apps-ui-kit';
import { useGetAllCoins } from '~/hooks';

function CoinDetails(): JSX.Element {
    const { id } = useParams<{ id: string }>();
    const coinType = id ? normalizeStructTag(id) : null;

    const { data, isLoading } = useGetAllCoins(1, coinType);
    const coin = data?.pages[0]?.coins[0];

    if (isLoading) {
        return <PageLayout content={<LoadingIndicator />} />;
    }

    return (
        <PageLayout
            content={
                <div className="flex flex-col gap-xl">
                    <CoinMeta
                        name={coin?.name ?? ''}
                        description={coin?.description}
                        iconUrl={coin?.iconUrl}
                        coinType={coin?.coinType ?? ''}
                    />
                    <Panel>
                        <div className="p-md--rs"></div>
                    </Panel>
                </div>
            }
        />
    );
}

export { CoinDetails };
