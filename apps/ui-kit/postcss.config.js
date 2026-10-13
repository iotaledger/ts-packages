// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

module.exports = {
    plugins: {
        'postcss-import': {},
        'postcss-url': { url: 'inline', filter: /@fontsource/ },
        'tailwindcss/nesting': {},
        tailwindcss: {},
        autoprefixer: {},
    },
};
