// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    Accordion,
    AccordionContent,
    Card,
    CardAction,
    CardActionType,
    CardBody,
    CardImage,
    CardType,
    ImageType,
} from '@iota/apps-ui-kit';
import {
    type BalanceChange,
    type BalanceChangeSummary,
    formatBalanceToUSD,
    getRecognizedUnRecognizedTokenChanges,
    useBalanceInUSD,
    useCoinMetadata,
    useFormatCoin,
    ImageIconSize,
    CoinIcon,
} from '@iota/core';
import { useIotaClientContext } from '@iota/dapp-kit';
import { type Network } from '@iota/iota-sdk/client';
import { CoinFormat } from '@iota/iota-sdk/utils';
import { RecognizedBadge } from '@iota/apps-ui-icons';
import { useMemo } from 'react';
import { AddressLink, CollapsibleCard } from '~/components/ui';
import { BREAK_POINT, useMediaQuery } from '~/hooks';

interface BalanceChangesProps {
    changes: BalanceChangeSummary;
}

function BalanceChangeEntry({ change }: { change: BalanceChange }): JSX.Element | null {
    const { amount, coinType, recipient, unRecognizedToken } = change;
    const isLargeScreen = useMediaQuery(`(min-width: ${BREAK_POINT.lg}px)`);
    const coinFormat = isLargeScreen ? CoinFormat.Full : CoinFormat.Rounded;
    const [formatted, symbol] = useFormatCoin({ balance: amount, coinType, format: coinFormat });
    const { data: coinMetaData } = useCoinMetadata(coinType);
    const { network } = useIotaClientContext();
    const amountInUSD = useBalanceInUSD(coinType, amount, network as Network);
    const isPositive = BigInt(amount) > 0n;

    if (!change) {
        return null;
    }

    return (
        <div className="flex flex-col gap-xs">
            <div
                className={
                    isPositive
                        ? '[&_.card-action-title-color]:!text-iota-tertiary-30 dark:[&_.card-action-title-color]:!text-iota-tertiary-80'
                        : '[&_.card-action-title-color]:!text-iota-error-30 dark:[&_.card-action-title-color]:!text-iota-error-80'
                }
            >
                <Card type={CardType.Filled}>
                    <CardImage type={ImageType.BgTransparent}>
                        <CoinIcon coinType={coinType} size={ImageIconSize.Small} />
                    </CardImage>
                    <CardBody
                        title={coinMetaData?.name || symbol}
                        icon={
                            !unRecognizedToken ? (
                                <RecognizedBadge className="h-4 w-4 text-iota-primary-40" />
                            ) : null
                        }
                    />
                    <CardAction
                        type={CardActionType.SupportingText}
                        title={`${isPositive ? '+' : ''} ${formatted} ${symbol}`}
                        subtitle={
                            amountInUSD && Math.abs(amountInUSD) >= 0.005
                                ? formatBalanceToUSD(Math.abs(amountInUSD))
                                : undefined
                        }
                    />
                </Card>
            </div>
            {recipient && (
                <div className="flex flex-wrap items-center px-sm py-xs">
                    <span className="w-full flex-shrink-0 text-label-lg text-iota-neutral-40 md:w-1/4 dark:text-iota-neutral-60">
                        Recipient
                    </span>
                    <AddressLink address={recipient} copyText={recipient} />
                </div>
            )}
        </div>
    );
}

function BalanceChangeCard({ changes, owner }: { changes: BalanceChange[]; owner: string }) {
    const { recognizedTokenChanges, unRecognizedTokenChanges } = useMemo(
        () => getRecognizedUnRecognizedTokenChanges(changes),
        [changes],
    );

    return (
        <CollapsibleCard
            title="Balance Changes"
            isTransparentPanel
            rawData={changes}
            footer={
                owner ? (
                    <div className="flex flex-wrap items-center px-md--rs py-sm--rs">
                        <span className="w-1/4 shrink-0 text-body-md text-iota-neutral-10 dark:text-iota-neutral-92">
                            Owner
                        </span>
                        <div className="flex flex-row items-center gap-xs">
                            <AddressLink
                                address={owner}
                                copyText={owner}
                                className="[&>div]:max-w-[200px] [&>div]:truncate"
                                display="block"
                            />
                        </div>
                    </div>
                ) : null
            }
        >
            <div className="flex flex-col gap-md px-md--rs py-sm">
                {recognizedTokenChanges.map((change, index) => (
                    <div key={index + change.coinType}>
                        <Accordion>
                            <AccordionContent isExpanded>
                                <BalanceChangeEntry change={change} />
                            </AccordionContent>
                        </Accordion>
                    </div>
                ))}
                {unRecognizedTokenChanges.length > 0 && (
                    <div className="flex flex-col gap-md">
                        {unRecognizedTokenChanges.map((change, index) => (
                            <div key={index + change.coinType}>
                                <Accordion hideBorder>
                                    <AccordionContent isExpanded>
                                        <BalanceChangeEntry change={change} />
                                    </AccordionContent>
                                </Accordion>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </CollapsibleCard>
    );
}

export function BalanceChanges({ changes }: BalanceChangesProps) {
    if (!changes) return null;

    return (
        <>
            {Object.entries(changes).map(([owner, changes]) => (
                <BalanceChangeCard key={owner} changes={changes} owner={owner} />
            ))}
        </>
    );
}
