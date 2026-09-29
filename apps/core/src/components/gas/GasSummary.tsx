// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ExplorerLinkType } from '../../enums';
import { useFormatCoin } from '../../hooks';
import { type GasSummaryType, RenderExplorerLink } from '../../types';
import { AmountWithFiat } from '../coin';
import { CoinFormat, formatAddress } from '@iota/iota-sdk/utils';

import { KeyValueInfo } from '@iota/apps-ui-kit';

interface GasSummaryProps {
    renderExplorerLink: RenderExplorerLink;
    activeAddress: string | null | undefined;
    sender?: string | null;
    gasSummary?: GasSummaryType;
    isPending?: boolean;
    isError?: boolean;
}

export function GasSummary({
    sender,
    gasSummary,
    isPending,
    isError,
    renderExplorerLink: ExplorerLink,
    activeAddress,
}: GasSummaryProps) {
    const address = sender || activeAddress;
    const [gas, symbol] = useFormatCoin({ balance: gasSummary?.totalGas, format: CoinFormat.Full });

    const isGasFeeAmount = !isPending && !isError && !gasSummary?.isSponsored;

    const gasValueText = isPending
        ? 'Estimating...'
        : isError
          ? 'Gas estimation failed'
          : `${gasSummary?.isSponsored ? 0 : gas}`;

    if (!gasSummary)
        return <KeyValueInfo keyText="Gas fee" value="0" supportingLabel={symbol} fullwidth />;

    const gasAmountWithFiat = (
        <AmountWithFiat amount={gasSummary.totalGas ?? 0} formatted={gas} symbol={symbol} />
    );

    return (
        <>
            {address === gasSummary.owner && (
                <KeyValueInfo
                    keyText="Gas fee"
                    value={isGasFeeAmount ? gasAmountWithFiat : gasValueText}
                    supportingLabel={isGasFeeAmount ? undefined : symbol}
                    fullwidth
                />
            )}
            {gasSummary.isSponsored && gasSummary.owner && (
                <>
                    <KeyValueInfo keyText="Sponsored fee" value={gasAmountWithFiat} fullwidth />
                    <KeyValueInfo
                        keyText="Sponsor"
                        value={
                            <ExplorerLink
                                type={ExplorerLinkType.Address}
                                address={gasSummary.owner}
                                eventType="address"
                            >
                                {formatAddress(gasSummary.owner)}
                            </ExplorerLink>
                        }
                        fullwidth
                    />
                </>
            )}
        </>
    );
}
