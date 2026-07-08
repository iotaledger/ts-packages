// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef, useState } from 'react';

import { Button, ButtonSize, ButtonType, Divider, Dropdown } from '@iota/apps-ui-kit';
import { Globe } from '@iota/apps-ui-icons';
import { Transition } from '@headlessui/react';
import { NetworkSelector } from './NetworkSelector';
import { NetworkVersion } from './NetworkVersion';

export function NetworkMenu(): JSX.Element {
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
            <Button
                type={ButtonType.Outlined}
                size={ButtonSize.Small}
                aria-label="Network"
                icon={<Globe className="size-5 m-0.5" />}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            />
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
                            <NetworkSelector />
                            <Divider />
                            <NetworkVersion />
                        </div>
                    </Dropdown>
                </div>
            </Transition>
        </div>
    );
}
