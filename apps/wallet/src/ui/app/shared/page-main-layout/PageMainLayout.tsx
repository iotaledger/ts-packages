// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ErrorBoundary, MenuContent, Navigation, WalletSettingsButton } from '_components';
import cn from 'clsx';
import { createContext, type ReactNode, useState } from 'react';
import { useAppSelector, useActiveAccount, useExplorerLink } from '_hooks';
import { ExtensionViewType } from '../../redux/slices/app/appType';
import { Header } from '../header/Header';
import { Toaster } from '../toaster';
import { ArrowTopRight, Copy, IotaLogoMark, Keystone, Ledger, Passkey } from '@iota/apps-ui-icons';
import { Link } from 'react-router-dom';
import { isLedgerAccountSerializedUI } from '_src/background/accounts/ledgerAccount';
import { type SerializedUIAccount } from '_src/background/accounts/account';
import { Badge, BadgeType, ButtonUnstyled } from '@iota/apps-ui-kit';
import { isLegacyAccount } from '_src/background/accounts/isLegacyAccount';
import { ExplorerLinkType, toast, useGetDefaultIotaName } from '@iota/core';
import { formatAddress } from '@iota/iota-sdk/utils';
import { formatAccountName } from '../../helpers';
import { isKeystoneAccountSerializedUI } from '_src/background/accounts/keystoneAccount';
import { isPasskeyAccountSerializedUI } from '_src/background/accounts/passkeyAccount';
import { ampli } from '_src/shared/analytics';

export const PageMainLayoutContext = createContext<HTMLDivElement | null>(null);

export interface PageMainLayoutProps {
    children: ReactNode | ReactNode[];
    bottomNavEnabled?: boolean;
    topNavMenuEnabled?: boolean;
    dappStatusEnabled?: boolean;
}

export function PageMainLayout({
    children,
    bottomNavEnabled = false,
    topNavMenuEnabled = false,
}: PageMainLayoutProps) {
    const extensionViewType = useAppSelector((state) => state.app.extensionViewType);
    const activeAccount = useActiveAccount();
    const isFullScreen = extensionViewType === ExtensionViewType.FullScreen;
    const [titlePortalContainer, setTitlePortalContainer] = useState<HTMLDivElement | null>(null);
    const isHomePage = window.location.hash === '#/tokens';

    return (
        <div
            className={cn(
                'flex max-h-full w-full flex-1 flex-col flex-nowrap items-stretch justify-center overflow-hidden',
                isFullScreen ? 'rounded-xl' : '',
            )}
        >
            {isHomePage ? (
                <Header
                    leftContent={<LeftContent account={activeAccount} />}
                    middleContent={<div ref={setTitlePortalContainer} />}
                    rightContent={topNavMenuEnabled ? <WalletSettingsButton /> : undefined}
                />
            ) : null}
            <div className="relative flex flex-grow flex-col flex-nowrap overflow-hidden">
                <div className="flex flex-grow flex-col flex-nowrap overflow-y-auto overflow-x-hidden bg-iota-neutral-100 dark:bg-iota-neutral-6">
                    <main
                        className={cn('flex w-full flex-grow flex-col', {
                            'p-5': bottomNavEnabled && isHomePage,
                            'h-full': !isHomePage,
                        })}
                    >
                        <PageMainLayoutContext.Provider value={titlePortalContainer}>
                            <ErrorBoundary>{children}</ErrorBoundary>
                        </PageMainLayoutContext.Provider>
                    </main>
                    <Toaster bottomNavEnabled={bottomNavEnabled} />
                </div>
                {topNavMenuEnabled ? <MenuContent /> : null}
            </div>
            {bottomNavEnabled ? <Navigation /> : null}
        </div>
    );
}

function LeftContent({ account }: { account: SerializedUIAccount | null }) {
    const { data: iotaName } = useGetDefaultIotaName(account?.address);
    const hasCustomName = !!(account?.nickname || iotaName);
    const accountName = formatAccountName(account?.nickname, iotaName, account?.address);
    const formattedAddress = formatAddress(account?.address || '');

    const isLedgerAccount = account && isLedgerAccountSerializedUI(account);
    const isKeystoneAccount = account && isKeystoneAccountSerializedUI(account);
    const isPasskeyAccount = account && isPasskeyAccountSerializedUI(account);

    const explorerHref = useExplorerLink({
        type: ExplorerLinkType.Address,
        address: account?.address,
    });
    function openExplorerLink(event: React.MouseEvent<HTMLButtonElement>) {
        event?.stopPropagation();
        event?.preventDefault();
        if (explorerHref) {
            const newWindow = window.open(explorerHref, '_blank', 'noopener noreferrer');
            if (newWindow) newWindow.opener = null;
        }
        ampli.openedLink({ type: 'address' });
    }
    return (
        <Link
            to="/accounts/manage"
            className="flex flex-row items-center gap-sm p-xs"
            data-testid="accounts-manage"
        >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-iota-primary-30 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-white">
                {isLedgerAccount ? (
                    <Ledger />
                ) : isKeystoneAccount ? (
                    <Keystone />
                ) : isPasskeyAccount ? (
                    <Passkey />
                ) : (
                    <IotaLogoMark />
                )}
            </div>
            <div className="flex flex-col items-start gap-0.5">
                {hasCustomName && (
                    <span
                        className="text-title-sm text-iota-neutral-10 dark:text-iota-neutral-92"
                        data-amp-mask
                    >
                        {accountName}
                    </span>
                )}
                <div
                    className={
                        hasCustomName
                            ? 'flex flex-row items-center gap-1 text-iota-neutral-40 dark:text-iota-neutral-60'
                            : 'flex flex-row items-center gap-1 text-iota-neutral-10 dark:text-iota-neutral-92'
                    }
                >
                    <span
                        className={hasCustomName ? 'text-label-sm' : 'text-title-sm'}
                        data-amp-mask
                    >
                        {formattedAddress}
                    </span>
                    <ButtonUnstyled
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            navigator.clipboard.writeText(account?.address ?? '');
                            ampli.copiedElement({ type: 'address' });
                            toast('Address copied');
                        }}
                        className="opacity-100"
                        aria-label="Copy to clipboard"
                    >
                        <Copy />
                    </ButtonUnstyled>
                    <ButtonUnstyled
                        onClick={openExplorerLink}
                        className="opacity-100"
                        aria-label="Open in new tab"
                    >
                        <ArrowTopRight />
                    </ButtonUnstyled>
                </div>
            </div>
            {isLegacyAccount(account) && <Badge type={BadgeType.Neutral} label="Legacy" />}
        </Link>
    );
}
