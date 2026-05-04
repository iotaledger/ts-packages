// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

export interface CalendarAlert {
    description: string;
    triggerAt: Date;
}

export interface CalendarEvent {
    title: string;
    description: string;
    date: Date;
    alerts?: CalendarAlert[];
}
