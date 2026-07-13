// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ButtonSegment, ButtonSegmentType } from '@iota/apps-ui-kit';
import type { IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { useState } from 'react';

export enum PageSection {
    Overview = 'overview-section',
    Summary = 'summary-section',
    Inputs = 'inputs-section',
    Transactions = 'transactions-section',
    Gas = 'gas-section',
}

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

    return (
        <div className="grid grid-cols-2 gap-x-md gap-y-xs px-md--rs sm:flex sm:flex-row sm:flex-wrap sm:px-0">
            {pageSections.map((section) => (
                <ButtonSegment
                    key={section}
                    onClick={() => goToSection(section)}
                    label={PAGE_SECTION_LABELS[section]}
                    selected={activeSection === section}
                    type={ButtonSegmentType.Underlined}
                />
            ))}
        </div>
    );
}
