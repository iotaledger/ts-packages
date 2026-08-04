// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import colors from 'tailwindcss/colors';
import { type Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
// Note: exception for the tailwind preset import
import uiKitResponsivePreset from '../../apps/ui-kit/src/lib/tailwind/responsive.presets';
import { pxToRem } from '../../apps/ui-kit/src/lib/tailwind/helpers';

/** Explorer-only, so that the ui-kit breakpoints keep serving the other apps unchanged. */
const CONTAINER_BREAKPOINTS = {
    tablet: 1024,
    desktop: 1280,
    ultrawide: 1920,
};

const CONTAINER_MAX_WIDTH = 2160;

/**
 * Replaces the container of the ui-kit preset, which caps the page well below the width of a common
 * monitor and leaves the data tables cramped. It wins over the `.container` of the ui-kit
 * stylesheet, imported ahead of the components layer in `index.css`.
 */
const fluidContainer = {
    width: '100%',
    maxWidth: pxToRem(CONTAINER_MAX_WIDTH),
    marginInline: 'auto',
    paddingInline: pxToRem(20),
    [`@media (min-width: ${CONTAINER_BREAKPOINTS.tablet}px)`]: {
        paddingInline: pxToRem(32),
    },
    [`@media (min-width: ${CONTAINER_BREAKPOINTS.desktop}px)`]: {
        paddingInline: pxToRem(48),
    },
    [`@media (min-width: ${CONTAINER_BREAKPOINTS.ultrawide}px)`]: {
        paddingInline: pxToRem(64),
    },
};

export default {
    presets: [uiKitResponsivePreset],
    content: [
        './src/**/*.{js,jsx,ts,tsx}',
        './../ui-kit/src/lib/**/*.{js,jsx,ts,tsx}',
        './../core/src/components/**/*.{ts,jsx,tsx}',
    ],
    darkMode: 'selector',
    corePlugins: {
        container: false,
    },
    theme: {
        extend: {
            colors: {
                white: colors.white,
                black: colors.black,
                transparent: colors.transparent,
                inherit: colors.inherit,
            },
            height: {
                header: '80px',
                'mobile-header': '120px',
            },
        },
    },
    plugins: [
        plugin(({ addComponents }) => {
            addComponents({ '.container': fluidContainer });
        }),
    ],
} satisfies Partial<Config>;
