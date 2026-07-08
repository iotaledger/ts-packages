// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef, useState } from 'react';

import { Button, ButtonSize, ButtonType, Divider, Dropdown } from '@iota/apps-ui-kit';
import { MoreHoriz } from '@iota/apps-ui-icons';
import { Transition } from '@headlessui/react';
import { ExpandableSection } from './ExpandableSection';
import { NetworkSelector } from './NetworkSelector';
import { NetworkVersion } from './NetworkVersion';
import { ThemeSelector } from './ThemeSelector';

export function SettingsMenu(): JSX.Element {
    const elementRef = useRef<HTMLDivElement>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            const el = elementRef?.current;

            if (!el || el.contains(event?.target as Node)) {
                return;
            }

            setIsDropdownOpen(false);
        };

        document.addEventListener('click', listener, true);
        document.addEventListener('touchstart', listener, true);

        return () => {
            document.removeEventListener('click', listener, true);
            document.removeEventListener('touchstart', listener, true);
        };
    }, [elementRef]);

    return (
        <div ref={elementRef} className="relative self-center">
            <div className="[&_button]:p-2.5">
                <Button
                    type={ButtonType.Outlined}
                    size={ButtonSize.Small}
                    aria-label="Settings"
                    icon={<MoreHoriz className="h-5 w-5" />}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                />
            </div>
            <Transition
                show={isDropdownOpen}
                enter="transition ease-in duration-100"
                enterFrom="opacity-0 translate-y-2"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-2"
            >
                <div className="absolute right-0 z-50 mt-xs w-72">
                    <Dropdown>
                        <div className="flex flex-col">
                            <ExpandableSection title="Network">
                                <NetworkSelector />
                            </ExpandableSection>
                            <ExpandableSection title="Theme">
                                <ThemeSelector />
                            </ExpandableSection>
                            <Divider />
                            <NetworkVersion />
                        </div>
                    </Dropdown>
                </div>
            </Transition>
        </div>
    );
}
