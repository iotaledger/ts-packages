// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type {
    MinimallyRequiredFeatures,
    Wallet,
    WalletAccount,
    WalletWithFeatures,
    WalletWithRequiredFeatures,
} from '@iota/wallet-standard';
import {
    getWallets,
    isSupportedChain,
    isWalletWithRequiredFeatureSet,
} from '@iota/wallet-standard';

export function getRegisteredWallets<AdditionalFeatures extends Wallet['features']>(
    preferredWallets: string[],
    walletFilter?: (wallet: WalletWithRequiredFeatures) => boolean,
) {
    const walletsApi = getWallets();
    const wallets = walletsApi.get();

    const iotaWallets = wallets.filter(
        (wallet): wallet is WalletWithFeatures<MinimallyRequiredFeatures & AdditionalFeatures> =>
            isWalletWithRequiredFeatureSet(wallet) && (!walletFilter || walletFilter(wallet)),
    );

    return [
        // Preferred wallets, in order:
        ...(preferredWallets
            .map((name) => iotaWallets.find((wallet) => wallet.name === name))
            .filter(Boolean) as WalletWithFeatures<
            MinimallyRequiredFeatures & AdditionalFeatures
        >[]),

        // Wallets in default order:
        ...iotaWallets.filter((wallet) => !preferredWallets.includes(wallet.name)),
    ];
}

export function getWalletUniqueIdentifier(wallet?: Wallet) {
    return wallet?.id ?? wallet?.name;
}

export function getIotaAccounts(accounts: readonly WalletAccount[]) {
    return accounts.filter((account) => account.chains.some(isSupportedChain));
}

export function getSelectedAccount(
    connectedAccounts: readonly WalletAccount[],
    accountAddress?: string,
) {
    if (connectedAccounts.length === 0) return null;
    if (accountAddress) {
        return (
            connectedAccounts.find((account) => account.address === accountAddress) ??
            connectedAccounts[0]
        );
    }
    return connectedAccounts[0];
}
