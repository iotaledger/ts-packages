// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useNavigate, useLocation } from 'react-router-dom';
import { Navbar, type NavbarItemWithId } from '@iota/apps-ui-kit';
import { Activity, Apps, Assets, Home } from '@iota/apps-ui-icons';

type NavbarItemWithPath = NavbarItemWithId & {
    path: string;
};

export const NAVBAR_ITEM_PATHS = {
    home: '/tokens',
    assets: '/nfts',
    apps: '/apps',
    activity: '/transactions',
} as const;

export function Navigation() {
    const navigate = useNavigate();
    const location = useLocation();

    const NAVBAR_ITEMS: NavbarItemWithPath[] = [
        { id: 'home', icon: <Home />, path: NAVBAR_ITEM_PATHS.home },
        { id: 'assets', icon: <Assets />, path: NAVBAR_ITEM_PATHS.assets },
        { id: 'apps', icon: <Apps />, path: NAVBAR_ITEM_PATHS.apps },
        { id: 'activity', icon: <Activity />, path: NAVBAR_ITEM_PATHS.activity },
    ];

    const activeId = NAVBAR_ITEMS.find((item) => location.pathname.startsWith(item.path))?.id || '';

    function handleItemClick(id: string) {
        const item = NAVBAR_ITEMS.find((item) => item.id === id);
        if (item && !item.isDisabled) {
            navigate(item.path, { replace: true });
        }
    }

    return (
        <div className="sticky bottom-0 w-full shrink-0 border-b-0 bg-iota-neutral-100 dark:bg-iota-neutral-6">
            <Navbar items={NAVBAR_ITEMS} activeId={activeId} onClickItem={handleItemClick} />
        </div>
    );
}
