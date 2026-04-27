// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

// Schema for validator object
export const ValidatorSchema = z.object({
    fields: z.object({
        name: z.string(),
        value: z.object({
            fields: z.object({
                inner: z.object({
                    fields: z.object({
                        id: z.object({
                            id: z.string(),
                        }),
                    }),
                }),
            }),
        }),
    }),
});
