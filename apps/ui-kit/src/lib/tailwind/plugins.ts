// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import plugin from 'tailwindcss/plugin';
import {
    INTERACTIVE_ELEMENT_SELECTOR,
    ROW_LINK_ATTRIBUTE,
} from '../constants/interactive.constants';

export const firefoxPlugin = plugin(({ addVariant }) => {
    addVariant('firefox', '@-moz-document url-prefix()');
});

export const namesVariant = plugin(({ addVariant }) => {
    addVariant('names', '&:is(.names *)');
});

export const tableRowVariants = plugin(({ addVariant }) => {
    const innerLink = `a:not([${ROW_LINK_ATTRIBUTE}])`;
    addVariant(
        'row-hover',
        `&:hover:not(:has(:is(${INTERACTIVE_ELEMENT_SELECTOR}):not([${ROW_LINK_ATTRIBUTE}]):hover))`,
    );
    addVariant('inner-link', `& ${innerLink}`);
    addVariant('inner-link-hover', `& ${innerLink}:hover`);
});
