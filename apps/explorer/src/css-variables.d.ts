// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import 'react';

declare module 'react' {
    interface CSSProperties {
        [key: `--${string}`]: string | number | null;
    }
}
