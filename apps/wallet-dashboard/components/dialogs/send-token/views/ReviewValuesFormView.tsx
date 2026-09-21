// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import { FormDataValues } from '../interfaces';
import {
    Button,
    Card,
    CardType,
    CardImage,
    ImageType,
    CardAction,
    CardActionType,
    KeyValueInfo,
    Divider,
    ButtonType,
    Header,
} from '@iota/apps-ui-kit';
import { CoinFormat, formatAddress, parseAmount } from '@iota/iota-sdk/utils';
import {
    CoinIcon,
    ImageIconSize,
    useFormatCoin,
    ExplorerLinkType,
    useCoinMetadata,
    useGetIotaNameRecord,
    NamedAddressTooltip,
    CoinFiatValue,
    AmountWithFiat,
} from '@iota/core';
import { Loader } from '@iota/apps-ui-icons';
import { ExplorerLink } from '@/components';
import { DialogLayoutBody, DialogLayoutFooter } from '../../layout';

interface ReviewValuesFormProps {
    formData: FormDataValues;
    senderAddress: string;
    isPending: boolean;
    executeTransfer: () => void;
    coinType: string;
    isPayAllIota?: boolean;
    onClose: () => void;
    onBack: () => void;
    totalGas: string | undefined;
}

export function ReviewValuesFormView({
    formData: { amount, to },
    senderAddress,
    isPending,
    executeTransfer,
    coinType,
    isPayAllIota,
    onClose,
    onBack,
    totalGas,
}: ReviewValuesFormProps): JSX.Element {
    const { data: nameRecord } = useGetIotaNameRecord(to);
    const { data: metadata } = useCoinMetadata(coinType);
    const amountWithoutDecimals = parseAmount(amount, metadata?.decimals ?? 0);
    const [roundedAmount, symbol] = useFormatCoin({
        balance: amountWithoutDecimals,
        coinType,
        format: CoinFormat.Rounded,
    });

    const [gasFormatted, gasSymbol] = useFormatCoin({
        balance: totalGas,
        format: CoinFormat.Full,
    });
    const totalGasAmount = totalGas ?? 0;

    return (
        <>
            <Header title="Review & Send" onClose={onClose} onBack={onBack} />
            <DialogLayoutBody>
                <div className="flex w-full flex-col gap-md">
                    {Number(amount) !== 0 ? (
                        <Card type={CardType.Filled}>
                            <CardImage type={ImageType.BgSolid}>
                                <CoinIcon coinType={coinType} rounded size={ImageIconSize.Small} />
                            </CardImage>
                            <div className="flex w-full flex-col">
                                <div className="flex flex-row items-center gap-x-xxs">
                                    <div className="card-body-title-color flex items-baseline gap-1 text-start font-inter text-title-md">
                                        <span>
                                            {isPayAllIota ? '~' : ''}
                                            {roundedAmount} {symbol}
                                        </span>
                                        <span className="flex items-baseline gap-0.5">
                                            <span className="key-supporting-text-color text-body-sm">
                                                ~
                                            </span>
                                            <CoinFiatValue
                                                amount={amountWithoutDecimals}
                                                coinType={coinType}
                                                withParentheses={false}
                                            />
                                        </span>
                                    </div>
                                </div>
                                <div className="card-body-subtitle-color text-start font-inter text-body-md">
                                    Amount
                                </div>
                            </div>
                            <CardAction type={CardActionType.SupportingText} />
                        </Card>
                    ) : null}
                    <div className="flex flex-col gap-md--rs p-sm--rs">
                        <KeyValueInfo
                            keyText={'From'}
                            value={
                                <ExplorerLink
                                    type={ExplorerLinkType.Address}
                                    address={senderAddress}
                                >
                                    <span data-amp-mask>{formatAddress(senderAddress)}</span>
                                </ExplorerLink>
                            }
                            fullwidth
                        />

                        <Divider />
                        <KeyValueInfo
                            keyText={'To'}
                            value={
                                <NamedAddressTooltip
                                    address={nameRecord?.targetAddress || to}
                                    name={nameRecord?.name}
                                >
                                    <ExplorerLink
                                        type={ExplorerLinkType.Address}
                                        address={nameRecord?.targetAddress || to}
                                    >
                                        <span data-amp-mask>
                                            {nameRecord ? nameRecord.name : formatAddress(to || '')}
                                        </span>
                                    </ExplorerLink>
                                </NamedAddressTooltip>
                            }
                            fullwidth
                        />

                        <Divider />
                        <KeyValueInfo
                            keyText={'Est. Gas Fees'}
                            value={
                                gasFormatted ? (
                                    <AmountWithFiat
                                        amount={totalGasAmount}
                                        formatted={gasFormatted}
                                        symbol={gasSymbol}
                                    />
                                ) : (
                                    '-'
                                )
                            }
                            fullwidth
                        />
                    </div>
                </div>
            </DialogLayoutBody>
            <DialogLayoutFooter>
                <Button
                    type={ButtonType.Primary}
                    onClick={executeTransfer}
                    text="Send Now"
                    disabled={coinType === null || isPending}
                    fullWidth
                    icon={isPending ? <Loader className="animate-spin" /> : undefined}
                    iconAfterText
                />
            </DialogLayoutFooter>
        </>
    );
}
