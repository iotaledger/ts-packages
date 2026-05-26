// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Button, ButtonType } from '@iota/apps-ui-kit';
import { ArrowBottomLeft, Stake, Send, Apps } from '@iota/apps-ui-icons';
import { FaucetRequestButton } from '_src/ui/app/shared/faucet/FaucetRequestButton';
import type { ReactNode } from 'react';

interface FeatureCardProps {
    icon: ReactNode;
    label: string;
    description: string;
}

function FeatureCard({ icon, label, description }: FeatureCardProps) {
    return (
        <div className="card-filled-bg flex flex-1 flex-col items-center gap-xs rounded-xl px-xxs py-sm ">
            <div className="flex text-iota-primary-30 dark:text-iota-primary-80 [&_svg]:h-5 [&_svg]:w-5">
                {icon}
            </div>
            <div className="flex flex-col items-center gap-xxxs">
                <span className="text-label-md text-iota-neutral-10 dark:text-iota-neutral-92">
                    {label}
                </span>
                <span className="text-label-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                    {description}
                </span>
            </div>
        </div>
    );
}

interface WalletEmptyStateProps {
    isMainnet: boolean;
    onReceiveClick: () => void;
}

export function WalletEmptyState({ isMainnet, onReceiveClick }: WalletEmptyStateProps) {
    return (
        <div className="flex w-full flex-grow flex-col items-center justify-between overflow-hidden pt-lg text-center">
            <div className="flex w-full flex-col items-center gap-lg">
                <div className="flex flex-col gap-xs">
                    <span className="text-title-lg text-iota-neutral-10 dark:text-iota-neutral-92">
                        {isMainnet ? 'Start building' : 'Try the IOTA network'}
                    </span>
                    <span className="text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                        {isMainnet
                            ? 'Receive IOTA to start staking and exploring'
                            : 'Request test tokens to explore the network'}
                    </span>
                </div>
                <div className="flex w-full gap-xs">
                    <FeatureCard icon={<Stake />} label="Stake" description="Earn rewards" />
                    <FeatureCard icon={<Send />} label="Send" description="Instant transfers" />
                    <FeatureCard icon={<Apps />} label="Explore" description="dApps & more" />
                </div>
            </div>

            <div className="relative z-10 w-full">
                {isMainnet ? (
                    <Button
                        onClick={onReceiveClick}
                        type={ButtonType.Primary}
                        icon={<ArrowBottomLeft />}
                        text="Receive IOTA"
                        fullWidth
                    />
                ) : (
                    <FaucetRequestButton />
                )}
            </div>
        </div>
    );
}
