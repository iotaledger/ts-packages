// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { TitleSize } from './titleSize.enums';
import { TitleVariant } from './titleVariant.enums';

export const TITLE_PADDINGS: Record<TitleVariant, Record<TitleSize, string>> = {
    [TitleVariant.Default]: {
        [TitleSize.Small]: 'px-md py-sm--rs',
        [TitleSize.Medium]: 'px-md--rs py-sm--rs',
    },
    [TitleVariant.Flush]: {
        [TitleSize.Small]: '',
        [TitleSize.Medium]: '',
    },
};

export const TITLE_SIZE: Record<TitleSize, string> = {
    [TitleSize.Small]: 'text-title-md',
    [TitleSize.Medium]: 'text-title-lg',
};
