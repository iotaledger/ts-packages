// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import zxcvbn from 'zxcvbn';

function addDot(str: string | undefined) {
    if (str && !str.endsWith('.')) {
        return `${str}.`;
    }
    return str;
}

export function validatePasswordStrength(val: string, ctx: z.RefinementCtx) {
    const {
        score,
        feedback: { warning, suggestions },
    } = zxcvbn(val);
    if (score <= 2) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${addDot(warning) || 'Password is not strong enough.'}${
                suggestions?.length ? ` ${suggestions.join(' ')}` : ''
            }`,
        });
    }
}
