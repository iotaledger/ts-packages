// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

export const INTERACTIVE_ELEMENT_SELECTOR = [
    'a',
    'button',
    'input',
    'select',
    'textarea',
    'label',
    '[role="button"]',
    '[role="checkbox"]',
    '[role="link"]',
    '[role="switch"]',
].join(',');

export const ROW_LINK_ATTRIBUTE = 'data-row-link';

export const ROW_LINK_PROPS = { [ROW_LINK_ATTRIBUTE]: true } as const;
