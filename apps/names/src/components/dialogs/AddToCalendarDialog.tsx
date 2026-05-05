// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import { Export, Globe } from '@iota/apps-ui-icons';
import { Dialog, DialogBody, DialogContent, DialogPosition, Header } from '@iota/apps-ui-kit';
import { normalizeIotaName } from '@iota/iota-names-sdk';

import { formatDate } from '@/lib/utils/format/formatDate';
import { buildEvent, google, ics } from '@/lib/utils/calendar';

interface AddToCalendarDialogProps {
    name: string;
    expirationDate: Date;
    setOpen: (bool: boolean) => void;
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
    }

    function handleDownloadIcs() {
        const event = buildEvent(name, expirationDate);
        downloadIcsFile(name, ics(event));
    }

    return (
        <Dialog open onOpenChange={setOpen}>
            <DialogContent isFixedPosition position={DialogPosition.Right}>
                <Header title="Add to Calendar" onClose={handleClose} />
                <DialogBody>
                    <div className="flex flex-col gap-md">
                        <p className="text-body-md text-names-neutral-60">
                            Add the expiry date of{' '}
                            <span className="text-names-neutral-92">{normalizeIotaName(name)}</span>{' '}
                            (
                            <span className="text-names-neutral-92">
                                {formatDate(expirationDate)}
                            </span>
                            ) to a calendar app.
                        </p>
                        <div className="flex flex-col gap-xs">
                            <CalendarOption
                                icon={<Globe />}
                                title="Google Calendar"
                                description="Opens Google Calendar to create an event. Note: automatic reminders are not supported, you will need to add them manually."
                                onClick={handleGoogleCalendar}
                            />
                            <CalendarOption
                                icon={<Export />}
                                title="Download .ics"
                                description="Downloads a calendar file compatible with any app. Includes reminders at 09:00 on the expiry day, 1 day before, 1 week before, and 1 month before."
                                onClick={handleDownloadIcs}
                            />
                        </div>
                    </div>
                </DialogBody>
            </DialogContent>
        </Dialog>
    );
}
