// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Button, ButtonSize, ButtonType } from '@iota/apps-ui-kit';
import { ArrowLeft, ArrowRight, DoubleArrowLeft } from '@iota/apps-ui-icons';

interface PaginationProps {
    hasFirst: boolean;
    hasPrev: boolean;
    hasNext: boolean;
    onFirst(): void;
    onPrev(): void;
    onNext(): void;
}

export function Pagination({
    hasNext,
    hasPrev,
    onFirst,
    onPrev,
    onNext,
}: PaginationProps): JSX.Element {
    return (
        <div className="flex gap-2 self-center md:self-start">
            <Button
                type={ButtonType.Secondary}
                size={ButtonSize.Small}
                icon={<DoubleArrowLeft />}
                onClick={onFirst}
                disabled={!hasPrev}
                aria-label="Go to first page"
            />
            <Button
                type={ButtonType.Secondary}
                size={ButtonSize.Small}
                icon={<ArrowLeft />}
                onClick={onPrev}
                disabled={!hasPrev}
                aria-label="Go to previous page"
            />
            <Button
                type={ButtonType.Secondary}
                size={ButtonSize.Small}
                icon={<ArrowRight />}
                disabled={!hasNext}
                onClick={onNext}
                aria-label="Go to next page"
            />
        </div>
    );
}
