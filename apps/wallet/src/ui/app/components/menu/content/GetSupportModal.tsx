// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    Button,
    ButtonType,
    Dialog,
    DialogBody,
    DialogContent,
    Header,
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
} from '@iota/apps-ui-kit';
import { ArrowTopRight, Discord, Info, Warning } from '@iota/apps-ui-icons';
import { DISCORD_SUPPORT_LINK } from '@iota/core';
import { ampli } from '_src/shared/analytics/ampli';

interface GetSupportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function GetSupportModal({ isOpen, onClose }: GetSupportModalProps) {
    function handleOpenDiscord() {
        ampli.openedLink({ type: 'discord support' });
        window.open(DISCORD_SUPPORT_LINK, '_blank', 'noopener noreferrer');
        onClose();
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent containerId="overlay-portal-container">
                <Header title="Get Support" onClose={onClose} />
                <DialogBody>
                    <div className="flex flex-col gap-y-md">
                        <div className="flex flex-col items-center gap-y-sm">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-iota-neutral-96 dark:bg-iota-neutral-12">
                                <Discord className="h-6 w-6 text-iota-neutral-10 dark:text-iota-neutral-92" />
                            </div>
                            <div className="flex flex-col gap-y-xxs text-center">
                                <p className="text-center text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                                    Open a ticket in the
                                </p>
                                <code className="rounded bg-iota-neutral-92 px-xxs py-xxxs font-mono text-iota-neutral-10 dark:bg-iota-neutral-20 dark:text-iota-neutral-92">
                                    #🆘｜raise-support-ticket
                                </code>
                                <p> channel to reach IOTA support.</p>
                            </div>
                        </div>
                        <InfoBox
                            title="Be cautious"
                            supportingText="Scammers may try to impersonate support staff in other channels."
                            icon={<Warning />}
                            type={InfoBoxType.Warning}
                            style={InfoBoxStyle.Elevated}
                        />
                        <InfoBox
                            title="Safety reminder"
                            supportingText="Never share your 24-word phrase or private key with anyone. If you do, you risk losing access to your funds."
                            icon={<Info />}
                            type={InfoBoxType.Default}
                            style={InfoBoxStyle.Elevated}
                        />

                        <Button
                            fullWidth
                            type={ButtonType.Outlined}
                            text="Open Discord"
                            onClick={handleOpenDiscord}
                            icon={<ArrowTopRight />}
                            iconAfterText
                        />
                    </div>
                </DialogBody>
            </DialogContent>
        </Dialog>
    );
}
