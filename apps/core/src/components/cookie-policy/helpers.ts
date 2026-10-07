// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { AMP_COOKIES_KEY } from './constants';

export function setCookieAccepted(): void {
    document.cookie = `${AMP_COOKIES_KEY}=true; max-age=31536000; path=/; SameSite=Strict`;
}

export function setCookieDeclined(): void {
    document.cookie = `${AMP_COOKIES_KEY}=false; path=/; SameSite=Strict`;
}

/**
 * Handle user accepting cookies.
 */
export function handleConsentAccepted(): void {
    setCookieAccepted();
}

/**
 * Handle user declining cookies.
 */
export function handleConsentDeclined(): void {
    setCookieDeclined();
}

/**
 * Check if user has previously given consent for cookies.
 */
export function getCookieConsentStatus() {
    if (typeof document === 'undefined') return 'pending';
    if (document.cookie.includes(`${AMP_COOKIES_KEY}=true`)) return 'accepted';
    if (document.cookie.includes(`${AMP_COOKIES_KEY}=false`)) return 'declined';
    return 'pending';
}
