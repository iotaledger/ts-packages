// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';

import { useGetIotaNameAvatar } from '../hooks/useGetIotaNameAvatar.js';
import * as styles from './IotaNameNftImage.css.js';

interface IotaNameNftImageProps {
    address: string | null | undefined;
    iotaNamesEnabled: boolean;
    alt?: string;
}

export function IotaNameNftImage({
    address,
    iotaNamesEnabled,
    alt = 'name NFT avatar',
}: IotaNameNftImageProps) {
    const { data: imageUrl, isLoading } = useGetIotaNameAvatar(address, iotaNamesEnabled);
    const [imgError, setImgError] = useState(false);

    if (!iotaNamesEnabled || isLoading || !imageUrl || imgError) {
        return null;
    }

    return (
        <img src={imageUrl} alt={alt} className={styles.image} onError={() => setImgError(true)} />
    );
}
