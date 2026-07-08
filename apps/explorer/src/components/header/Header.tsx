// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import cx from 'clsx';
import { NetworkMenu, ThemeSwitcherButton } from '../settings';
import { SearchButton, SearchModal } from '../search';
import { LinkWithQuery } from '~/components/ui';
import { ThemedIotaLogo } from '~/components';
import { useSearchShortcut } from '~/hooks';
import { Button, ButtonSize, ButtonType } from '@iota/apps-ui-kit';
import { MenuIcon } from '@iota/apps-ui-icons';
import { MobileMenu } from './MobileMenu';
import { NAV_LINKS, isNavLinkActive } from './navLinks';

function HeaderNav(): JSX.Element {
    const { pathname, search } = useLocation();

    return (
        <nav className="hidden flex-row flex-wrap justify-center gap-6 md:flex">
            {NAV_LINKS.map(({ label, to }) => {
                const isActive = isNavLinkActive(to, pathname, search);
                return (
                    <LinkWithQuery
                        key={label}
                        to={to}
                        className={cx(
                            "relative pb-0.5 text-label-lg text-iota-neutral-10 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:bg-iota-primary-30 after:transition-transform after:duration-200 after:content-[''] hover:after:scale-x-100 dark:text-iota-neutral-92 dark:after:bg-iota-primary-70",
                            isActive && 'after:scale-x-100',
                        )}
                    >
                        {label}
                    </LinkWithQuery>
                );
            })}
        </nav>
    );
}

export function Header(): JSX.Element {
    const [isSearchOpen, setSearchOpen] = useState(false);
    const [isMenuOpen, setMenuOpen] = useState(false);
    useSearchShortcut(() => setSearchOpen((open) => !open));

    return (
        <header className="flex h-header justify-center overflow-visible backdrop-blur-lg">
            <div className="container flex h-full flex-1 items-center justify-between gap-5">
                <div className="flex flex-nowrap items-center gap-x-2xl">
                    <LinkWithQuery
                        data-testid="nav-logo-button"
                        to="/"
                        className="flex flex-nowrap items-center gap-1 text-iota-neutral-10"
                    >
                        <ThemedIotaLogo />
                    </LinkWithQuery>
                    <HeaderNav />
                </div>
                <div className="flex flex-row items-center gap-xs">
                    <SearchButton onClick={() => setSearchOpen(true)} />
                    <div className="hidden items-stretch md:flex">
                        <ThemeSwitcherButton />
                    </div>
                    <div className="hidden items-stretch md:flex">
                        <NetworkMenu />
                    </div>
                    <div className="flex items-stretch md:hidden">
                        <Button
                            type={ButtonType.Outlined}
                            size={ButtonSize.Small}
                            aria-label="Open menu"
                            icon={<MenuIcon className="size-5" />}
                            onClick={() => setMenuOpen(true)}
                        />
                    </div>
                </div>
            </div>
            <SearchModal open={isSearchOpen} onOpenChange={setSearchOpen} />
            <MobileMenu open={isMenuOpen} onOpenChange={setMenuOpen} />
        </header>
    );
}
