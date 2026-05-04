// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import { Export, Globe } from '@iota/apps-ui-icons';
import { Dialog, DialogBody, DialogContent, DialogPosition, Header } from '@iota/apps-ui-kit';
import { normalizeIotaName } from '@iota/iota-names-sdk';

import { formatDate } from '@/lib/utils/format/formatDate';
import { type CalendarEvent, google, ics } from '@/lib/utils/calendar';

interface AddToCalendarDialogProps {
    name: string;
    expirationDate: Date;
    setOpen: (bool: boolean) => void;
}

function at9am(date: Date): Date {
    const d = new Date(date);
    d.setHours(9, 0, 0, 0);
    return d;
}

function buildEvent(name: string, expirationDate: Date): CalendarEvent {
    const displayName = normalizeIotaName(name);

    const oneMonthBefore = new Date(expirationDate);
    oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1);

    const oneDayBefore = new Date(expirationDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);

    return {
        title: `${displayName} – Renewal Reminder`,
        description: `Your IOTA name ${displayName} expires on ${formatDate(expirationDate)}. Remember to renew it at iotanames.com.`,
        date: expirationDate,
        alerts: [
            {
                triggerAt: at9am(oneMonthBefore),
                description: `1 month until ${displayName} expires`,
            },
            { triggerAt: at9am(oneDayBefore), description: `1 day until ${displayName} expires` },
            { triggerAt: at9am(expirationDate), description: `${displayName} expires today` },
        ],
    };
}

function downloadIcsFile(name: string, content: string): void {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${normalizeIotaName(name)}-renewal.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

interface CalendarOptionProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
}

function CalendarOption({ icon, title, description, onClick }: CalendarOptionProps) {
    return (
        <button
            onClick={onClick}
            className="flex items-start gap-md w-full rounded-xl bg-names-neutral-12 px-md py-sm hover:bg-names-neutral-20 transition-colors cursor-pointer text-left"
        >
            <span className="[&_svg]:h-6 [&_svg]:w-6 text-names-neutral-60 mt-0.5 shrink-0">
                {icon}
            </span>
            <div className="flex flex-col gap-xxs">
                <span className="text-body-lg text-names-neutral-92">{title}</span>
                <span className="text-body-sm text-names-neutral-60">{description}</span>
            </div>
        </button>
    );
}

export function AddToCalendarDialog({ name, expirationDate, setOpen }: AddToCalendarDialogProps) {
    function handleClose() {
        setOpen(false);
    }

    function handleGoogleCalendar() {
        const event = buildEvent(name, expirationDate);
        window.open(google(event), '_blank', 'noopener noreferrer');
        handleClose();
    }

    function handleDownloadIcs() {
        const event = buildEvent(name, expirationDate);
        downloadIcsFile(name, ics(event));
        handleClose();
    }

    return (
        <Dialog open onOpenChange={setOpen}>
            <DialogContent isFixedPosition position={DialogPosition.Right}>
                <Header title="Add to Calendar" onClose={handleClose} />
                <DialogBody>
                    <div className="flex flex-col gap-md">
                        <p className="text-body-md text-names-neutral-60">
                            Set a reminder for{' '}
                            <span className="text-names-neutral-92">{normalizeIotaName(name)}</span>{' '}
                            expiring on{' '}
                            <span className="text-names-neutral-92">
                                {formatDate(expirationDate)}
                            </span>
                            .
                        </p>
                        <div className="flex flex-col gap-xs">
                            <CalendarOption
                                icon={<Globe />}
                                title="Google Calendar"
                                description="Opens Google Calendar to create an event. Add reminders manually after the event is created."
                                onClick={handleGoogleCalendar}
                            />
                            <CalendarOption
                                icon={<Export />}
                                title="Download .ics"
                                description="Downloads a calendar file compatible with any app. Includes reminders at 09:00 on the day, 1 day before, and 1 month before."
                                onClick={handleDownloadIcs}
                            />
                        </div>
                    </div>
                </DialogBody>
            </DialogContent>
        </Dialog>
    );
}
