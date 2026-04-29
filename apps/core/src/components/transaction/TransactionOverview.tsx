// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    Card,
    CardBody,
    CardImage,
    CardType,
    Divider,
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
    ImageType,
    KeyValueInfo,
    Panel,
} from '@iota/apps-ui-kit';
import { CheckmarkFilled, Close } from '@iota/apps-ui-icons';
import { CoinFormat, formatAddress, IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';

import {
    type TransactionDisplay,
    type TransactionKind,
} from '../../utils/transaction/buildTransactionDisplay';
import { type RenderExplorerLink } from '../../types';
import { CoinItem } from '../coin';
import { useFormatCoin } from '../../hooks';
import { formatDate } from '../../utils/formatDate';
import { NFTMediaRenderer } from '../nft';

const KIND_LABEL: Record<TransactionKind, string> = {
    send: 'Sent',
    receive: 'Received',
    stake: 'Staked',
    unstake: 'Unstaked',
    'timelocked-stake': 'Stake Vesting',
    'timelocked-unstake': 'Unstake Vesting',
    'timelocked-collect': 'Collect Vesting',
    migration: 'Migration',
    'contract-call': 'Contract Call',
    system: 'System',
    failed: 'Failed',
};

interface TransactionOverviewProps {
    display: TransactionDisplay;
    activeAddress: string | null;
    renderExplorerLink: RenderExplorerLink;
}

function ObjectOverviewItem({
    name,
    typeLabel,
    thumbnail,
}: NonNullable<TransactionDisplay['primaryObject']>) {
    const mediaSrc = thumbnail ? thumbnail.replace(/^ipfs:\/\//, 'https://ipfs.io/ipfs/') : '';

    return (
        <Card type={CardType.Default}>
            <CardImage type={ImageType.BgTransparent}>
                {mediaSrc ? (
                    <div className="h-10 w-10 overflow-hidden rounded-lg border border-shader-neutral-light-8">
                        <NFTMediaRenderer
                            src={mediaSrc}
                            alt={name}
                            disableVideoControls
                            disableAutoPlay
                        />
                    </div>
                ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-shader-neutral-light-8 bg-iota-neutral-96 text-label-md text-iota-neutral-60 dark:bg-iota-neutral-12 dark:text-iota-neutral-40">
                        {name.charAt(0).toUpperCase()}
                    </div>
                )}
            </CardImage>
            <div className="min-w-0 flex-1 overflow-hidden">
                <CardBody title={name} subtitle={typeLabel || 'NFT'} isTextTruncated />
            </div>
        </Card>
    );
}

function CoinOrObjectOverview({ display }: { display: TransactionDisplay }) {
    if (display.primaryObject) {
        return <ObjectOverviewItem {...display.primaryObject} />;
    }

    if (display.primary) {
        return (
            <CoinItem
                coinType={display.primary.coinType}
                balance={display.primary.amount}
                format={CoinFormat.Full}
            />
        );
    }

    return null;
}

export function TransactionOverview({
    display,
    activeAddress,
    renderExplorerLink: _renderExplorerLink,
}: TransactionOverviewProps) {
    const isSuccess = display.status === 'success';
    const isSender = !!activeAddress && display.sender === activeAddress;

    const txnDate = display.timestampMs
        ? formatDate(Number(display.timestampMs), ['day', 'month', 'year', 'hour', 'minute'])
        : '';

    const infoBoxTitle = isSuccess ? KIND_LABEL[display.kind] : 'Transaction Failed';

    const fromCounterparties = display.counterparties.filter((c) => c.direction === 'from');
    const toCounterparties = display.counterparties.filter((c) => c.direction === 'to');
    const objectFromCounterparty = display.primaryObject?.from
        ? [{ address: display.primaryObject.from }]
        : [];
    const objectToCounterparty = display.primaryObject?.to
        ? [{ address: display.primaryObject.to }]
        : [];
    const effectiveFromCounterparties = fromCounterparties.length
        ? fromCounterparties
        : objectFromCounterparty;
    const effectiveToCounterparties = toCounterparties.length
        ? toCounterparties
        : objectToCounterparty;

    const hasCounterparties =
        effectiveFromCounterparties.length > 0 || effectiveToCounterparties.length > 0;

    // Format the net fee for the fee row (only shown for sender).
    const [formattedFee, feeSymbol] = useFormatCoin({
        balance: display.fee?.net,
        coinType: IOTA_TYPE_ARG,
        format: CoinFormat.Full,
    });

    const showNetworkFee = isSender && display.fee && !display.primaryObject;
    const hasSummaryRows = hasCounterparties || !!showNetworkFee;

    return (
        <div className="flex flex-col gap-md">
            <InfoBox
                type={isSuccess ? InfoBoxType.Success : InfoBoxType.Error}
                style={InfoBoxStyle.Elevated}
                title={infoBoxTitle}
                supportingText={txnDate}
                icon={isSuccess ? <CheckmarkFilled /> : <Close />}
            />

            <Panel hasBorder>
                <div className="flex flex-col overflow-hidden rounded-xl">
                    <CoinOrObjectOverview display={display} />

                    {hasSummaryRows && (
                        <div className="flex flex-col gap-y-sm px-md pb-md">
                            {(display.primary || display.primaryObject) && <Divider />}

                            {effectiveFromCounterparties.map((cp) => (
                                <KeyValueInfo
                                    key={cp.address}
                                    keyText="From"
                                    value={formatAddress(cp.address)}
                                    isTruncated
                                    fullwidth
                                />
                            ))}

                            {effectiveToCounterparties.length === 1 && (
                                <KeyValueInfo
                                    keyText="To"
                                    value={formatAddress(effectiveToCounterparties[0].address)}
                                    isTruncated
                                    fullwidth
                                />
                            )}

                            {effectiveToCounterparties.length > 1 && (
                                <KeyValueInfo
                                    keyText="To"
                                    value={`${effectiveToCounterparties.length} addresses`}
                                    fullwidth
                                />
                            )}

                            {showNetworkFee && (
                                <KeyValueInfo
                                    keyText="Network fee"
                                    value={formattedFee}
                                    supportingLabel={feeSymbol}
                                    fullwidth
                                />
                            )}
                        </div>
                    )}
                </div>
            </Panel>

            {!isSuccess && display.failureMessage && (
                <InfoBox
                    type={InfoBoxType.Error}
                    style={InfoBoxStyle.Default}
                    title="Error details"
                    supportingText={display.failureMessage}
                />
            )}
        </div>
    );
}
