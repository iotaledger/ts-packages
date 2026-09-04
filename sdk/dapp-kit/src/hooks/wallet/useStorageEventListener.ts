// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useContext, useEffect, useRef } from 'react';

import { WalletContext } from '../../contexts/walletContext.js';
import {
    getIotaAccounts,
    getSelectedAccount,
    getWalletUniqueIdentifier,
} from '../../utils/walletUtils.js';
import { useWallets } from './useWallets.js';

type ParsedWalletState = {
    walletName: string;
    accountAddress: string;
};

function parsePersistedWalletState(raw: string): ParsedWalletState | null {
    try {
        const parsed = JSON.parse(raw);
        const walletName = parsed?.state?.lastConnectedWalletName;
        const accountAddress = parsed?.state?.lastConnectedAccountAddress;
        return walletName && accountAddress ? { walletName, accountAddress } : null;
    } catch {
        return null;
    }
}

function useLatestRef<T>(value: T) {
    const ref = useRef(value);
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref;
}

/**
 * Internal hook that listens to localStorage `storage` events from other browser tabs
 * and synchronizes wallet connection state reactively. Only active when `enabled` is true.
 */
export function useStorageEventListener(enabled: boolean, storageKey: string) {
    const store = useContext(WalletContext);
    const walletsRef = useLatestRef(useWallets());

    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return;

        async function handler(event: StorageEvent) {
            // Only react to localStorage events for our specific key. Guarding storageArea
            // prevents sessionStorage writes (e.g. from third-party libs) from incorrectly
            // triggering a disconnect.
            if (event.storageArea !== localStorage) return;
            if (event.key !== storageKey) return;

            if (!event.newValue) {
                store?.getState().setWalletDisconnected();
                return;
            }

            const parsed = parsePersistedWalletState(event.newValue);
            if (!parsed) {
                store?.getState().setWalletDisconnected();
                return;
            }

            const {
                walletName: lastConnectedWalletName,
                accountAddress: lastConnectedAccountAddress,
            } = parsed;

            // Read current state imperatively so we always compare against the latest value.
            const state = store?.getState();
            if (state?.currentAccount?.address === lastConnectedAccountAddress) return;

            const currentWalletName = state?.currentWallet
                ? getWalletUniqueIdentifier(state.currentWallet)
                : null;

            if (currentWalletName === lastConnectedWalletName && state?.currentWallet) {
                const accountToSelect = state.currentWallet.accounts.find(
                    (a) => a.address === lastConnectedAccountAddress,
                );
                if (accountToSelect) {
                    // Switch the active account locally without a full reconnect round-trip.
                    // Loop safety: setAccountSwitched writes lastConnectedAccountAddress back
                    // to localStorage via Zustand persist, but the resulting storage event is
                    // caught by the address-equality check above and discarded immediately.
                    state.setAccountSwitched(accountToSelect);
                    return;
                }
                // Account not yet in wallet.accounts (list may be stale) — fall through
                // to full reconnect so the wallet can refresh its account list.
            }

            const wallet = walletsRef.current.find(
                (w) => getWalletUniqueIdentifier(w) === lastConnectedWalletName,
            );
            if (!wallet) return;

            // Call the wallet feature directly instead of going through the useConnectWallet
            // mutation to avoid the intermediate 'connecting' status flash in the UI for an
            // operation the user did not initiate in this tab.
            try {
                const connectResult = await wallet.features['standard:connect'].connect({
                    silent: true,
                });
                const connectedAccounts = getIotaAccounts(connectResult.accounts);
                const selectedAccount = getSelectedAccount(
                    connectedAccounts,
                    lastConnectedAccountAddress,
                );
                store
                    ?.getState()
                    .setWalletConnected(
                        wallet,
                        connectedAccounts,
                        selectedAccount,
                        connectResult.supportedIntents,
                    );
            } catch {
                // Ignore connection errors during cross-tab sync — the tab stays in its
                // current state rather than showing an error for an action taken elsewhere.
            }
        }

        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);

        // walletsRef is intentionally excluded — it is kept fresh via useLatestRef without
        // re-registering the listener on every wallet list change.
    }, [enabled, storageKey, store]);
}
