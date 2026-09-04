// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Header } from '@iota/apps-ui-kit';
import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HOME_PATH, TAB_BAR_PATHS, useNavigationDepth } from './NavigationStackProvider';

interface PageTemplateProps {
    title?: string;
    children: ReactNode;
    isTitleCentered?: boolean;
    onBack?: () => void;
}

export function PageTemplate({ title, children, isTitleCentered, onBack }: PageTemplateProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const depth = useNavigationDepth();

    const handleBack = useCallback(() => {
        if (onBack) {
            onBack();
        } else if (TAB_BAR_PATHS.has(location.pathname)) {
            navigate(HOME_PATH, { replace: true });
        } else {
            navigate(-1);
        }
    }, [onBack, navigate, location.pathname]);

    const handleClose = useCallback(() => {
        navigate(HOME_PATH, { replace: true });
    }, [navigate]);

    return (
        <div className="flex h-full w-full flex-col">
            {title && (
                <Header
                    titleCentered={isTitleCentered}
                    title={title}
                    onBack={depth >= 1 ? handleBack : undefined}
                    onClose={depth >= 2 ? handleClose : undefined}
                />
            )}
            <div className="w-full flex-1 overflow-y-auto overflow-x-hidden bg-iota-neutral-100 p-md dark:bg-iota-neutral-6">
                {children}
            </div>
        </div>
    );
}
