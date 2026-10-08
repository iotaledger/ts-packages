// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

export interface ExternalLinkProps {
    href: string;
    className?: string;
    children: ReactNode;
    title?: string;
    onClick?(): void;
}

/**
 * External link component.
 * For programmatic external link opening (e.g., window.open), use the useExternalLink hook instead.
 */
export function ExternalLink({ href, className, children, title, onClick }: ExternalLinkProps) {
    const handleClick = () => {
        onClick?.();
    };

    return (
        <Link
            href={href}
            target="_blank"
            className={className}
            rel="noopener noreferrer"
            title={title}
            onClick={handleClick}
        >
            {children}
        </Link>
    );
}
