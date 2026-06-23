// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BalanceVisibilityState {
    isBalanceVisible: boolean;
    setBalanceVisible: (visible: boolean) => void;
}

export const useBalanceVisibilityStore = create<BalanceVisibilityState>()(
    persist(
        (set) => ({
            isBalanceVisible: true,
            setBalanceVisible: (visible) => set({ isBalanceVisible: visible }),
        }),
        { name: 'balance-visibility' },
    ),
);

export function useBalanceVisibility() {
    const isBalanceVisible = useBalanceVisibilityStore((state) => state.isBalanceVisible);
    const setBalanceVisible = useBalanceVisibilityStore((state) => state.setBalanceVisible);
    return { isBalanceVisible, toggleBalanceVisible: () => setBalanceVisible(!isBalanceVisible) };
}
