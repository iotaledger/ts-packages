// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import { COOKIE_CONSENT_KEY, setCookieAccepted, setCookieDeclined } from '@iota/core';
import { toast } from 'react-hot-toast';

import { CookiePolicyContent } from '@/components/cookie-policy/CookiePolicyContent';

export default function CookiePolicy() {
    async function handleConsentAccepted() {
        setCookieAccepted();
        toast.success('Your cookie preferences have been saved.');
    }

    async function handleConsentDeclined() {
        setCookieDeclined();
        toast.success('Your cookie preferences have been saved.');
    }
    return (
        <section className="cookie-policy-page">
            <CookiePolicyContent
                consentKey={COOKIE_CONSENT_KEY}
                necessaryCookies={[
                    {
                        name: COOKIE_CONSENT_KEY,
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
