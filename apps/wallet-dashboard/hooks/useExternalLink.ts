// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from 'react';

/**
 * Hook for programmatic external link.
 * Use this when you need to open external links via window.open().
 *
 * For declarative links in JSX, use the ExternalLink component instead.
 *
 * @param url - The URL to open
 * @param options - Configuration options
 * @returns A callback function that opens the URL
 *
 * @example
 * ```tsx
 * const openDocs = useExternalLink('https://docs.example.com', {
 *   type: 'documentation'
 * });
 *
 * return <Button onClick={openDocs}>View Docs</Button>;
 * ```
 */
export function useExternalLink(url: string) {
    const open = useCallback(() => {
        window.open(url, '_blank', 'noopener,noreferrer');
    }, [url]);

    return open;
}
