// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

export const NAV_LINKS = [
    { label: 'Validators', to: '/validators' },
    { label: 'Transactions', to: '/recent?tab=transactions' },
    { label: 'Epochs', to: '/recent?tab=epochs' },
    { label: 'Checkpoints', to: '/recent?tab=checkpoints' },
    { label: 'Analytics', to: '/analytics' },
];

const DEFAULT_RECENT_TAB = 'transactions';

export function isNavLinkActive(to: string, pathname: string, search: string): boolean {
    const [path, query] = to.split('?');

    if (path === '/recent') {
        if (pathname !== '/recent') {
            return false;
        }
        const currentTab = new URLSearchParams(search).get('tab') ?? DEFAULT_RECENT_TAB;
        const linkTab = new URLSearchParams(query).get('tab') ?? DEFAULT_RECENT_TAB;
        return currentTab === linkTab;
    }

    return pathname === path || pathname.startsWith(`${path}/`);
}
