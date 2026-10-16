// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    CookiePolicyContent,
    COOKIE_CONSENT_KEY,
    handleConsentAccepted,
    handleConsentDeclined,
} from '@iota/core';

export function CookiePolicy(): React.JSX.Element {
    return (
        <CookiePolicyContent
            consentKey={COOKIE_CONSENT_KEY}
            necessaryCookies={[
                {
                    name: COOKIE_CONSENT_KEY,
                    purpose: "Stores the user's cookies consent state for the current domain",
                    provider: 'IOTA',
                    category: 'Necessary',
                    expiration: '1 year',
                },
            ]}
            onAccept={handleConsentAccepted}
            onReject={handleConsentDeclined}
        />
    );
}
