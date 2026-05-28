// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Portal } from '../Portal';
import { Toaster as ToasterCore, toast, useToasterStore } from '@iota/core';

const ROUTES_WITH_BOTTOM_CONTENT = [
    '/send',
    '/dapp/connect',
    '/dapp/approve',
    '/accounts/import-ledger-accounts',
    '/accounts/manage/accounts-finder',
    '/accounts/manage',
];

const LIMIT_MAX_TOASTS = 5;

export function Toaster({ bottomNavEnabled = false }: { bottomNavEnabled?: boolean }) {
    const { pathname } = useLocation();
    const { toasts } = useToasterStore();

    useEffect(() => {
        toasts
            .filter((t) => t.visible)
            .filter((_, i) => i >= LIMIT_MAX_TOASTS)
            .forEach((t) => toast.dismiss(t.id));
    }, [toasts]);

    const hasBottomContent = ROUTES_WITH_BOTTOM_CONTENT.some((path) => pathname.startsWith(path));
    return (
        <Portal containerId="toaster-portal-container">
            <ToasterCore
                containerClassName={`!absolute transition-all${bottomNavEnabled || hasBottomContent ? ' !bottom-20' : ''}`}
                snackbarWrapClassName="w-full break-words"
            />
        </Portal>
    );
}
