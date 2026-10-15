// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

type ProgressBarSize = 'small' | 'medium' | 'large';

const sizes: Record<ProgressBarSize, string> = {
    small: 'h-1',
    medium: 'h-2',
    large: 'h-3',
};

export interface ProgressBarProps {
    progress: number;
    size?: ProgressBarSize;
}

export function ProgressBar({ progress, size = 'small' }: ProgressBarProps): JSX.Element {
    return (
        <div className="relative w-full rounded-full bg-iota-primary-90 dark:bg-iota-primary-10">
            <div
                className={`${sizes[size]} rounded-full bg-iota-primary-30 transition-[width] duration-300 ease-out dark:bg-iota-primary-80`}
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}
