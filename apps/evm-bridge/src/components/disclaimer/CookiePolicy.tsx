// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    CookiePolicyContent,
    AMP_COOKIES_KEY,
    handleConsentAccepted,
    handleConsentDeclined,
} from '@iota/core';

export function CookiePolicy(): React.JSX.Element {
    return (
        <CookiePolicyContent
            consentKey={AMP_COOKIES_KEY}
            necessaryCookies={[
                {
                    name: AMP_COOKIES_KEY,
                    purpose: "Stores the user's cookies consent state for the current domain",
                    provider: 'IOTA',
                    category: 'Analytics',
                    expiration: '1 year',
                },
            ]}
            onAccept={handleConsentAccepted}
            onReject={handleConsentDeclined}
        />
    );
}
