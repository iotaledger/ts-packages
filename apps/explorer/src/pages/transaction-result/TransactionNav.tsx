// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Chip } from '@iota/apps-ui-kit';
import type { IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { useEffect, useRef, useState } from 'react';

export enum PageSection {
    Overview = 'overview-section',
    Summary = 'summary-section',
    Inputs = 'inputs-section',
    Transactions = 'transactions-section',
    Gas = 'gas-section',
}

const SCROLL_SPY_OFFSET = 160;

const PAGE_SECTION_LABELS: Record<PageSection, string> = {
    [PageSection.Overview]: 'Overview',
    [PageSection.Summary]: 'Summary',
    [PageSection.Inputs]: 'Inputs',
    [PageSection.Transactions]: 'Transactions',
    [PageSection.Gas]: 'Gas & Storage Fee',
};

interface TransactionNavProps {
    transaction: IotaTransactionBlockResponse;
}

export function TransactionNav({ transaction }: TransactionNavProps): JSX.Element {
    const [activeSection, setActiveSection] = useState<PageSection>(PageSection.Overview);
    const navRef = useRef<HTMLDivElement>(null);

    const isProgrammableTransaction =
        transaction.transaction?.data.transaction?.kind === 'ProgrammableTransaction';

    const pageSections = [
        PageSection.Overview,
        PageSection.Summary,
        ...(isProgrammableTransaction
            ? [PageSection.Gas, PageSection.Inputs, PageSection.Transactions]
            : []),
    ];

    function goToSection(section: PageSection) {
        setActiveSection(section);
        document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        function onScroll() {
            const spyLine =
                (navRef.current?.getBoundingClientRect().bottom ?? SCROLL_SPY_OFFSET) + 16;
            let current = pageSections[0];
            for (const section of pageSections) {
                const element = document.getElementById(section);
                if (element && element.getBoundingClientRect().top <= spyLine) {
                    current = section;
                }
            }
            setActiveSection(current);
        }
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [pageSections.join(',')]);

    return (
        <div ref={navRef} className="sticky top-[128px] z-10 md:top-[88px]">
            <div className="panel-bg panel-border-color flex flex-row flex-wrap items-center gap-x-xs gap-y-xs rounded-3xl border p-xs sm:gap-x-md sm:rounded-full">
                {pageSections.map((section) => (
                    <Chip
                        key={section}
                        onClick={() => goToSection(section)}
                        label={PAGE_SECTION_LABELS[section]}
                        selected={activeSection === section}
                    />
                ))}
            </div>
        </div>
    );
}
