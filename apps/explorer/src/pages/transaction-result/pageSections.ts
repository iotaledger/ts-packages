// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

export enum PageSection {
    Overview = 'overview-section',
    Changes = 'changes-section',
    Inputs = 'inputs-section',
    Transactions = 'transactions-section',
    Events = 'events-section',
}

export const PAGE_SECTION_LABELS: Record<PageSection, string> = {
    [PageSection.Overview]: 'Overview',
    [PageSection.Changes]: 'Changes',
    [PageSection.Inputs]: 'Inputs',
    [PageSection.Transactions]: 'Transactions',
    [PageSection.Events]: 'Events',
};
