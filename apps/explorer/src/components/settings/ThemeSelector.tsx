// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { RadioButton } from '@iota/apps-ui-kit';
import { ThemePreference, useTheme } from '@iota/core';

const THEME_OPTIONS: { label: string; value: ThemePreference }[] = [
    { label: 'Light', value: ThemePreference.Light },
    { label: 'Dark', value: ThemePreference.Dark },
    { label: 'System', value: ThemePreference.System },
];

export function ThemeSelector(): JSX.Element {
    const { themePreference, setThemePreference } = useTheme();

    return (
        <div className="flex flex-col gap-2 px-4 py-3">
            {THEME_OPTIONS.map(({ label, value }) => (
                <RadioButton
                    key={value}
                    label={label}
                    isChecked={themePreference === value}
                    onChange={() => setThemePreference(value)}
                />
            ))}
        </div>
    );
}
