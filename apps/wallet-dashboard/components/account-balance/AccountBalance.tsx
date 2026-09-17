// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useCurrentAccount, useIotaClientContext } from '@iota/dapp-kit';
import {
    useBalance,
    useFormatCoin,
    useGetFiatBalance,
    useGetAllBalances,
    useGetDefaultIotaName,
    toast,
    BALANCE_MASK,
} from '@iota/core';
import {
    Button,
    ButtonSize,
    ButtonType,
    ButtonUnstyled,
    LoadingIndicator,
    Panel,
} from '@iota/apps-ui-kit';
import { getNetwork } from '@iota/iota-sdk/client';
import { formatAddress } from '@iota/iota-sdk/utils';
import { ReceiveFundsDialog, SendTokenDialog } from '../dialogs';
import { useCallback, useState } from 'react';
import { trackElementCopied } from '@/lib/utils';
import { useBalanceVisibility } from '@/store/balanceVisibility';
import {
    ArrowBottomLeft,
    ArrowTopRight,
    Copy,
    Send,
    VisibilityOff,
    VisibilityOn,
} from '@iota/apps-ui-icons';

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
    const { data: iotaName } = useGetDefaultIotaName(address);

    function openSendTokenDialog(): void {
        setIsSendTokenDialogOpen(true);
    }

    function openReceiveTokenDialog(): void {
        setIsReceiveDialogOpen(true);
    }

    const onCopyAddress = useCallback(async () => {
        if (!address || !navigator.clipboard) return;
        try {
            await navigator.clipboard.writeText(address);
            toast('Address copied');
            trackElementCopied('address');
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    }, [address]);

    function onOpenExplorer(): void {
        const newWindow = window.open(explorerLink, '_blank', 'noopener noreferrer');
        if (newWindow) newWindow.opener = null;
    }

    const sendTokenCoin = coinBalance?.totalBalance === '0' ? coinBalances?.[0] : coinBalance;

    return (
        <>
            <Panel>
                {isPending ? (
                    <div className="flex h-full w-full items-center justify-center p-lg">
                        <LoadingIndicator />
                    </div>
                ) : (
                    <div className="flex h-full flex-col justify-center gap-y-5 px-6 py-[22px]">
                        {address && (
                            <div className="flex min-w-0 items-baseline gap-2.5">
                                {iotaName && (
                                    <span className="truncate text-[14px] text-white">
                                        {iotaName}
                                    </span>
                                )}
                                <span className="flex-none font-mono text-[12px] text-[#8892a1]">
                                    {formatAddress(address)}
                                </span>
                                <ButtonUnstyled
                                    onClick={onCopyAddress}
                                    className="flex flex-none self-center text-[#8892a1] transition-colors hover:text-iota-neutral-90"
                                    aria-label="Copy to clipboard"
                                >
                                    <Copy className="h-[13px] w-[13px]" />
                                </ButtonUnstyled>
                                <ButtonUnstyled
                                    onClick={onOpenExplorer}
                                    className="flex flex-none self-center text-[#8892a1] transition-colors hover:text-iota-neutral-90"
                                    aria-label="Open in explorer"
                                >
                                    <ArrowTopRight className="h-[13px] w-[13px]" />
                                </ButtonUnstyled>
                            </div>
                        )}
                        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                            <div className="flex min-w-0 flex-col gap-[3px]">
                                <div className="flex items-baseline gap-[7px]">
                                    <span
                                        data-testid="balance-amount"
                                        className="text-[40px] font-semibold leading-none tracking-[-0.02em] text-white [font-variant-numeric:tabular-nums]"
                                    >
                                        {isBalanceVisible ? formatted : BALANCE_MASK}
                                    </span>
                                    <span className="text-[14px] font-medium text-[#8892a1]">
                                        {symbol}
                                    </span>
                                    <ButtonUnstyled
                                        onClick={toggleBalanceVisible}
                                        className="text-[#8892a1] transition-colors hover:text-iota-neutral-90"
                                        aria-label={
                                            isBalanceVisible ? 'Hide balances' : 'Show balances'
                                        }
                                    >
                                        {isBalanceVisible ? (
                                            <VisibilityOn className="h-[15px] w-[15px]" />
                                        ) : (
                                            <VisibilityOff className="h-[15px] w-[15px]" />
                                        )}
                                    </ButtonUnstyled>
                                </div>
                                {fiatBalance && (
                                    <span className="text-[13px] text-[#8892a1] [font-variant-numeric:tabular-nums]">
                                        {isBalanceVisible ? fiatBalance : `${BALANCE_MASK} USD`}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-none items-center gap-2.5">
                                <div className="flex flex-col items-center gap-1">
                                    <Button
                                        onClick={openReceiveTokenDialog}
                                        type={ButtonType.Secondary}
                                        icon={<ArrowBottomLeft className="h-5 w-5" />}
                                        size={ButtonSize.Medium}
                                        aria-label="Receive"
                                    />
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <Button
                                        onClick={openSendTokenDialog}
                                        icon={<Send className="h-5 w-5" />}
                                        size={ButtonSize.Medium}
                                        disabled={!address || coinBalances?.length === 0}
                                        testId="send-coin-button"
                                        aria-label="Send"
                                    />
                                </div>
                            </div>
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
