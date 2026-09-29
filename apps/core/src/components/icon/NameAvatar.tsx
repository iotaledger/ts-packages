// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import cn from 'clsx';
import { type ReactNode, useEffect, useState } from 'react';
import { useIotaNameAvatar } from '../../hooks/useIotaNameAvatar';

export enum NameAvatarSize {
    Xxs = 'h-5 w-5',
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
}

export function NameAvatar({
    address,
    fallback,
    className,
    size = NameAvatarSize.Full,
}: NameAvatarProps) {
    const { imageUrl } = useIotaNameAvatar(address);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false);
    }, [imageUrl]);

    if (imageUrl && !imgError) {
        return (
            <img
                src={imageUrl}
                alt="name avatar"
                className={cn('rounded-full object-cover', size, className)}
                onError={() => setImgError(true)}
            />
        );
    }

    if (!fallback) {
        return null;
    }

    return (
        <div className={cn('flex items-center justify-center rounded-full', size, className)}>
            {fallback}
        </div>
    );
}
