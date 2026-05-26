// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Button, ButtonType } from '@iota/apps-ui-kit';
import { ArrowBottomLeft, Stake, Send, Apps } from '@iota/apps-ui-icons';
import { FaucetRequestButton } from '_src/ui/app/shared/faucet/FaucetRequestButton';
import { SonarRingsAnimation } from './SonarRingsAnimation';
import type { ReactNode } from 'react';

interface FeatureCardProps {
    icon: ReactNode;
    label: string;
    description: string;
}

function FeatureCard({ icon, label, description }: FeatureCardProps) {
    return (
        <div className="flex flex-1 flex-col items-center gap-xs rounded-xl bg-iota-neutral-96 px-xxs py-sm dark:bg-iota-neutral-12">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-iota-primary-30/10 text-iota-primary-30 [&_svg]:h-4 [&_svg]:w-4">
                {icon}
            </div>
            <div className="flex flex-col items-center gap-xxxs">
                <span className="text-label-sm text-iota-neutral-10 dark:text-iota-neutral-92">
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
        <div className="relative flex w-full flex-grow flex-col items-center justify-between overflow-hidden pb-sm pt-2xl text-center">
            <SonarRingsAnimation />

            <div className="relative z-10 flex w-full flex-col items-center gap-xl">
                <div className="flex flex-col gap-xs">
                    <span className="text-title-md text-iota-neutral-10 dark:text-iota-neutral-92">
                        {isMainnet ? 'Your wallet is ready' : 'Try the IOTA network'}
                    </span>
                    <span className="text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                        {isMainnet
                            ? 'Receive IOTA to start staking and exploring'
                            : 'Request test tokens to explore the network'}
                    </span>
                </div>
                <div className="relative z-10 flex w-full gap-xs">
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
