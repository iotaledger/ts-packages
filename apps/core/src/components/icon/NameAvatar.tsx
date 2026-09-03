// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import cn from 'clsx';
import { type ReactNode, useEffect, useState } from 'react';
import { useGetIotaNameAvatar } from '../../hooks/useGetIotaNameAvatar';

export enum NameAvatarSize {
    Xs = 'h-8 w-8',
    Small = 'h-10 w-10',
    Medium = 'h-12 w-12',
    Large = 'h-16 w-16',
    Full = 'h-full w-full',
}

interface NameAvatarProps {
    address: string | null | undefined;
    fallback?: ReactNode;
    className?: string;
    size?: NameAvatarSize;
    showFallback?: boolean;
}

export function NameAvatar({
    address,
    fallback,
    className,
    size = NameAvatarSize.Full,
    showFallback = false,
}: NameAvatarProps) {
    const { data: avatarUrl, isLoading } = useGetIotaNameAvatar(address);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false);
    }, [avatarUrl]);

    if (!isLoading && avatarUrl && !imgError) {
        return (
            <img
                src={avatarUrl}
                alt="name avatar"
                className={cn('rounded-full object-cover', size, className)}
                onError={() => setImgError(true)}
            />
        );
    }

    if (!isLoading && showFallback && fallback) {
        return (
            <div className={cn('flex items-center justify-center rounded-full', size, className)}>
                {fallback}
            </div>
        );
    }

    return null;
}
