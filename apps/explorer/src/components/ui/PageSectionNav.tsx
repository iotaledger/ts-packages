// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ButtonSegment } from '@iota/apps-ui-kit';
import cx from 'clsx';
import { type ReactNode, useEffect, useRef, useState } from 'react';

const SCROLL_SPY_OFFSET = 160;

export const PAGE_SECTION_SCROLL_MARGIN =
    'scroll-mt-[300px] sm:scroll-mt-[184px] md:scroll-mt-[152px]';

export interface PageSectionNavItem {
    id: string;
    label: string;
}

interface PageSectionNavProps {
    sections: PageSectionNavItem[];
    actions?: ReactNode;
    disabled?: boolean;
}

export function PageSectionNav({
    sections,
    actions,
    disabled,
}: PageSectionNavProps): JSX.Element | null {
    const [activeSection, setActiveSection] = useState<string>(sections[0]?.id ?? '');
    const navRef = useRef<HTMLDivElement>(null);

    function goToSection(id: string) {
        setActiveSection(id);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        function onScroll() {
            const spyLine =
                (navRef.current?.getBoundingClientRect().bottom ?? SCROLL_SPY_OFFSET) + 16;
            let current = sections[0]?.id;
            for (const section of sections) {
                const element = document.getElementById(section.id);
                if (element && element.getBoundingClientRect().top <= spyLine) {
                    current = section.id;
                }
            }
            const isAtPageBottom =
                window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1;
            if (isAtPageBottom) {
                current = sections[sections.length - 1]?.id;
            }
            if (current) setActiveSection(current);
        }
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [sections.map(({ id }) => id).join(',')]);

    if (!sections.length) return null;

    return (
        <div
            ref={navRef}
            className="panel-bg panel-border-color sticky top-[88px] z-10 flex w-full flex-wrap items-center justify-between gap-md rounded-3xl border p-xs sm:rounded-full"
        >
            <div className="flex flex-row flex-wrap items-center gap-x-xxs gap-y-xxs sm:gap-x-md md:gap-x-xs md:gap-y-xs">
                {sections.map(({ id, label }) => (
                    <ButtonSegment
                        key={id}
                        onClick={() => goToSection(id)}
                        label={label}
                        selected={!disabled && activeSection === id}
                        disabled={disabled}
                    />
                ))}
            </div>
            {actions && (
                <div className="flex flex-row flex-wrap items-center gap-xs pl-sm md:gap-md md:pr-xs">
                    {actions}
                </div>
            )}
        </div>
    );
}

interface PageSectionAnchorProps {
    id: string;
    className?: string;
    children: ReactNode;
}

export function PageSectionAnchor({
    id,
    className,
    children,
}: PageSectionAnchorProps): JSX.Element {
    return (
        <div id={id} className={cx(PAGE_SECTION_SCROLL_MARGIN, className)}>
            {children}
        </div>
    );
}
