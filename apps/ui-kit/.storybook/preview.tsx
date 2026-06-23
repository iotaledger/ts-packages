// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type Preview } from '@storybook/react';
import { withThemeByClassName } from '@storybook/addon-themes';

import '../src/lib/styles/index.css';

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        backgrounds: {
            disable: true,
        },
    },
    decorators: [
        withThemeByClassName({
            themes: {
                light: 'light',
                dark: 'dark',
                names: 'names',
            },
            defaultTheme: 'light',
        }),
    ],
};

export default preview;
