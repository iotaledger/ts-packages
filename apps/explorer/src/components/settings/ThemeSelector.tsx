// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { DarkMode, LightMode } from '@iota/apps-ui-icons';
import { Button, ButtonSize, ButtonType, RadioButton } from '@iota/apps-ui-kit';
import { Theme, ThemePreference, useTheme } from '@iota/core';
import { cx } from 'class-variance-authority';

const THEME_OPTIONS: { label: string; value: ThemePreference }[] = [
    { label: 'Light', value: ThemePreference.Light },
    { label: 'Dark', value: ThemePreference.Dark },
    { label: 'System', value: ThemePreference.System },
];

export function ThemeSelectorMenu(): JSX.Element {
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


export function ThemeSwitcherButton(): JSX.Element {
    const { theme, setThemePreference } = useTheme();
    const isDark = theme === Theme.Dark;
    const Icon = isDark ? LightMode : DarkMode;

    function onClick() {
        setThemePreference(isDark ? ThemePreference.Light : ThemePreference.Dark);
    }

    return (
        <Button
            type={ButtonType.Outlined}
            size={ButtonSize.Small}
            aria-label="Toggle theme"
            icon={<Icon className={cx('size-5 m-px')} />}
            onClick={onClick}
        />
    );
}
