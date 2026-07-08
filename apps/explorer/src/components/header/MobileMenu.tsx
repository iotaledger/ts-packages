// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useLocation } from 'react-router-dom';
import cx from 'clsx';
import { Dialog, DialogContent, DialogPosition, Divider, Header } from '@iota/apps-ui-kit';
import { LinkWithQuery } from '~/components/ui';
import { ExpandableSection, NetworkSelector, NetworkVersion, ThemeSelector } from '../settings';
import { NAV_LINKS, isNavLinkActive } from './navLinks';

interface MobileMenuProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MobileMenu({ open, onOpenChange }: MobileMenuProps): JSX.Element {
    const { pathname, search } = useLocation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent position={DialogPosition.Right}>
                <Header title="Menu" onClose={() => onOpenChange(false)} />
                <div className="flex flex-col gap-sm overflow-y-auto p-md--rs">
                    <nav className="flex flex-col">
                        {NAV_LINKS.map(({ label, to }) => {
                            const isActive = isNavLinkActive(to, pathname, search);
                            return (
                                <LinkWithQuery
                                    key={label}
                                    to={to}
                                    onClick={() => onOpenChange(false)}
                                    className={cx(
                                        'rounded-lg px-md py-sm text-title-md text-iota-neutral-10 hover:bg-shader-neutral-light-8 dark:text-iota-neutral-92 dark:hover:bg-shader-neutral-dark-8',
                                        isActive &&
                                            'bg-shader-neutral-light-8 font-semibold dark:bg-shader-neutral-dark-8',
                                    )}
                                >
                                    {label}
                                </LinkWithQuery>
                            );
                        })}
                    </nav>
                    <Divider />
                    <ExpandableSection title="Network">
                        <NetworkSelector />
                    </ExpandableSection>
                    <ExpandableSection title="Theme">
                        <ThemeSelector />
                    </ExpandableSection>
                    <Divider />
                    <NetworkVersion />
                </div>
            </DialogContent>
        </Dialog>
    );
}
