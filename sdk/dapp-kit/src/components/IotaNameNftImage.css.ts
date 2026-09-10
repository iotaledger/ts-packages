// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { style } from '@vanilla-extract/css';

import { themeVars } from '../themes/themeContract.js';

export const image = style({
    width: 24,
    height: 24,
    flexShrink: 0,
    borderRadius: themeVars.radii.full,
    objectFit: 'cover',
});
