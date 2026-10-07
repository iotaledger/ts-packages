// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import { AMP_COOKIES_KEY } from '@iota/core';
import { toast } from 'react-hot-toast';

import { CookiePolicyContent } from '@/components/cookie-policy/CookiePolicyContent';
import { setCookieConsentAccepted, setCookieConsentDeclined } from '@/lib/utils/cookieConsent';

export default function CookiePolicy() {
    async function handleConsentAccepted() {
        setCookieConsentAccepted();
        toast.success('Your cookie preferences have been saved.');
    }

    async function handleConsentDeclined() {
        setCookieConsentDeclined();
        toast.success('Your cookie preferences have been saved.');
    }
    return (
        <section className="cookie-policy-page">
            <CookiePolicyContent
                consentKey={AMP_COOKIES_KEY}
                necessaryCookies={[
                    {
                        name: AMP_COOKIES_KEY,
                        purpose: "Stores the user's cookies consent state for the current domain",
                        provider: 'IOTA',
                        expiration: '1 year',
                    },
                ]}
                onAccept={handleConsentAccepted}
                onReject={handleConsentDeclined}
            />
        </section>
    );
}
