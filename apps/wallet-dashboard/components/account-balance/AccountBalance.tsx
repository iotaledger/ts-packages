// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useCurrentAccount, useIotaClientContext } from '@iota/dapp-kit';
import {
    useBalance,
    useFormatCoin,
    useGetFiatBalance,
    useGetAllBalances,
    NamedAddress,
    toast,
    BALANCE_MASK,
} from '@iota/core';
import { Button, ButtonSize, ButtonType, LoadingIndicator, Panel } from '@iota/apps-ui-kit';
import { getNetwork } from '@iota/iota-sdk/client';
import { ReceiveFundsDialog, SendTokenDialog } from '../dialogs';
import { useCallback, useState } from 'react';
import { trackElementCopied } from '@/lib/utils';
import { useBalanceVisibility } from '@/store/balanceVisibility';
import { ArrowBottomLeft, Send, VisibilityOff, VisibilityOn } from '@iota/apps-ui-icons';

export function AccountBalance() {
    const account = useCurrentAccount();
    const address = account?.address;
    const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
    const { network } = useIotaClientContext();
    const { id: networkId, explorer } = getNetwork(network);
    const fiatBalance = useGetFiatBalance(networkId);
    const { data: coinBalance, isPending } = useBalance(address!);
    const [formatted, symbol] = useFormatCoin({ balance: coinBalance?.totalBalance });
    const [isSendTokenDialogOpen, setIsSendTokenDialogOpen] = useState(false);
    const explorerLink = `${explorer}/address/${address}`;
    const { data: coinBalances } = useGetAllBalances(account?.address);
    const { isBalanceVisible, toggleBalanceVisible } = useBalanceVisibility();

    function openSendTokenDialog(): void {
        setIsSendTokenDialogOpen(true);
    }

    function openReceiveTokenDialog(): void {
        setIsReceiveDialogOpen(true);
    }

    const onCopySuccess = useCallback(() => {
        toast('Address copied');
        trackElementCopied('address');
    }, []);

    const sendTokenCoin = coinBalance?.totalBalance === '0' ? coinBalances?.[0] : coinBalance;

    return (
        <>
            <Panel>
                {isPending ? (
                    <div className="flex h-full w-full items-center justify-center p-lg">
                        <LoadingIndicator />
                    </div>
                ) : (
                    <div className="flex h-full flex-col justify-center gap-y-xs px-lg">
                        {address && (
                            <div
                                className="flex w-full justify-center"
                                data-full-address={address}
                                data-amp-mask
                            >
                                <NamedAddress
                                    address={address}
                                    isCopyable
                                    copyText={address}
                                    isExternal
                                    externalLink={explorerLink}
                                    onCopySuccess={onCopySuccess}
                                />
                            </div>
                        )}
                        <div className="flex items-center justify-center gap-xxs">
                            <span
                                data-testid="balance-amount"
                                className="text-headline-md text-iota-neutral-10 dark:text-iota-neutral-92"
                            >
                                {isBalanceVisible ? formatted : BALANCE_MASK}
                            </span>
                            <span className="text-label-md text-iota-neutral-40 dark:text-iota-neutral-60">
                                {symbol}
                            </span>
                            {fiatBalance && (
                                <div className="flex text-label-md text-iota-neutral-40 dark:text-iota-neutral-60">
                                    {isBalanceVisible ? fiatBalance : `${BALANCE_MASK} USD`}
                                </div>
                            )}
                            <Button
                                type={ButtonType.Ghost}
                                size={ButtonSize.Small}
                                onClick={toggleBalanceVisible}
                                className="flex items-center transition-colors hover:text-iota-neutral-10 dark:hover:text-iota-neutral-92"
                                aria-label={isBalanceVisible ? 'Hide balances' : 'Show balances'}
                                icon={
                                    isBalanceVisible ? (
                                        <VisibilityOn className="h-4 w-4" />
                                    ) : (
                                        <VisibilityOff className="h-4 w-4" />
                                    )
                                }
                            />
                        </div>
                        <div className="flex flex-row items-center justify-center gap-xs">
                            <Button
                                onClick={openReceiveTokenDialog}
                                type={ButtonType.Secondary}
                                icon={<ArrowBottomLeft className="h-5 w-5" />}
                                size={ButtonSize.Small}
                                aria-label="Receive"
                            />
                            <Button
                                onClick={openSendTokenDialog}
                                icon={<Send className="h-5 w-5" />}
                                size={ButtonSize.Small}
                                disabled={!address || coinBalances?.length === 0}
                                testId="send-coin-button"
                                aria-label="Send"
                            />
                        </div>
                    </div>
                )}
                {address && (
                    <>
                        {sendTokenCoin && (
                            <SendTokenDialog
                                activeAddress={address}
                                coin={sendTokenCoin}
                                open={isSendTokenDialogOpen}
                                setOpen={setIsSendTokenDialogOpen}
                            />
                        )}
                        <ReceiveFundsDialog
                            address={address}
                            open={isReceiveDialogOpen}
                            setOpen={setIsReceiveDialogOpen}
                        />
                    </>
                )}
            </Panel>
        </>
    );
}
