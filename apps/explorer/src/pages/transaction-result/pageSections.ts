// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

export enum PageSection {
    Overview = 'overview-section',
    Gas = 'gas-section',
    Signatures = 'signatures-section',
    Effects = 'effects-section',
    Changes = 'changes-section',
    ProgrammableTx = 'ptb-section',
    Events = 'events-section',
}

export const PAGE_SECTION_LABELS: Record<PageSection, string> = {
    [PageSection.Overview]: 'Overview',
    [PageSection.Gas]: 'Gas',
    [PageSection.Signatures]: 'Signatures',
    [PageSection.Effects]: 'Effects',
    [PageSection.Changes]: 'Changes',
    [PageSection.ProgrammableTx]: 'Programmable Tx',
    [PageSection.Events]: 'Events',
};
