// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { AMP_COOKIES_KEY } from '@iota/core';

/**
 * Check if user has previously given consent for cookies.
 */
export function getCookieConsentStatus() {
    if (typeof document === 'undefined') return 'pending';
    if (document.cookie.includes(`${AMP_COOKIES_KEY}=true`)) return 'accepted';
    if (document.cookie.includes(`${AMP_COOKIES_KEY}=false`)) return 'declined';
    return 'pending';
}

export function setCookieConsentAccepted() {
    document.cookie = `${AMP_COOKIES_KEY}=true; max-age=31536000; path=/; SameSite=Strict`;
}

export function setCookieConsentDeclined() {
    document.cookie = `${AMP_COOKIES_KEY}=false; max-age=31536000; path=/; SameSite=Strict`;
}
