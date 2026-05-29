// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Header } from '@iota/apps-ui-kit';
import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { HOME_PATH, useNavigationDepth } from './NavigationStackProvider';

interface PageTemplateProps {
    title?: string;
    children: ReactNode;
    isTitleCentered?: boolean;
    onBack?: () => void;
}

export function PageTemplate({ title, children, isTitleCentered, onBack }: PageTemplateProps) {
    const navigate = useNavigate();
    const depth = useNavigationDepth();

    const handleBack = useCallback(() => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    }, [onBack, navigate]);

    const handleClose = useCallback(() => {
        navigate(HOME_PATH);
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
