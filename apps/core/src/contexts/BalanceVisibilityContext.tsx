// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { createContext, useContext, type ReactNode } from 'react';

export const BALANCE_MASK = '••••••';

const BalanceVisibilityContext = createContext<boolean>(true);

export function BalanceVisibilityProvider({
    isVisible,
    children,
}: {
    isVisible: boolean;
    children: ReactNode;
}) {
    return (
        <BalanceVisibilityContext.Provider value={isVisible}>
            {children}
        </BalanceVisibilityContext.Provider>
    );
}

export function useBalanceVisible(): boolean {
    return useContext(BalanceVisibilityContext);
}
