// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useBalanceVisibilityStore } from '_src/ui/app/zustand/balance-visibility';

export function useBalanceVisibility() {
    const isBalanceVisible = useBalanceVisibilityStore((state) => state.isBalanceVisible);
    const setBalanceVisible = useBalanceVisibilityStore((state) => state.setBalanceVisible);
    return { isBalanceVisible, toggleBalanceVisible: () => setBalanceVisible(!isBalanceVisible) };
}
