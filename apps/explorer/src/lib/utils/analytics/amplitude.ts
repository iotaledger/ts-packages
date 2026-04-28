// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import * as amplitude from '@amplitude/analytics-browser';
import { attachEnvironmentPlugin, getAmplitudeConsentStatus } from '@iota/core';

import { ampli } from './ampli';
import { LogLevel } from '@amplitude/analytics-types';

const IS_ENABLED =
    import.meta.env.VITE_BUILD_ENV === 'production' &&
    import.meta.env.VITE_AMPLITUDE_ENABLED === 'true';

const IS_DEV = import.meta.env.VITE_BUILD_ENV !== 'production';

// Guards against duplicate listener registration on repeated initAmplitude calls.
let humanWaitSetup = false;
// Buffered network value set before Amplitude loads; replayed on first human interaction.
let pendingNetwork: string | null = null;

/**
 * Anti-bot protection: defers ampli.load() until a genuine human gesture is detected.
 */
export function initAmplitude(): void {
    const consentStatus = getAmplitudeConsentStatus();

    if (ampli.isLoaded || humanWaitSetup || consentStatus === 'declined') {
        return;
    }

    if (navigator.webdriver) {
        return;
    }

    humanWaitSetup = true;
    waitForHumanInteraction();
}

const HUMAN_SIGNAL_EVENTS = ['pointerdown', 'wheel', 'keydown', 'touchstart', 'copy'] as const;

function waitForHumanInteraction(): void {
    const controller = new AbortController();
    let handled = false;

    function onHumanInteraction() {
        if (handled) return;
        handled = true;
        controller.abort();
        void loadAmplitude();
    }

    const options = { passive: true, signal: controller.signal } as const;
    for (const event of HUMAN_SIGNAL_EVENTS) {
        window.addEventListener(event, onHumanInteraction, options);
    }
}

async function loadAmplitude(): Promise<void> {
    const consentStatus = getAmplitudeConsentStatus();
    if (ampli.isLoaded || consentStatus === 'declined') {
        return;
    }

    await ampli.load({
        environment: 'iotaexplorer',
        disabled: !IS_ENABLED,
        client: {
            configuration: {
                optOut: false,
                autocapture: {
                    attribution: IS_ENABLED,
                    fileDownloads: IS_ENABLED,
                    formInteractions: IS_ENABLED,
                    pageViews: IS_ENABLED,
                    sessions: IS_ENABLED,
                    elementInteractions: IS_ENABLED,
                    frustrationInteractions: false,
                    networkTracking: false,
                    webVitals: false,
                    pageUrlEnrichment: IS_ENABLED,
                },
                logLevel: LogLevel.None,
                identityStorage: 'localStorage',
            },
        },
    }).promise;

    ampli.client.add(attachEnvironmentPlugin(IS_DEV));

    if (pendingNetwork !== null) {
        setAmplitudeIdentity(pendingNetwork);
    }

    window.addEventListener(
        'pagehide',
        () => {
            ampli.client.setTransport('beacon');
            ampli.flush();
        },
        { once: true },
    );
}

export function setAmplitudeIdentity(network: string): void {
    pendingNetwork = network;

    if (!ampli.isLoaded) {
        return;
    }

    const identifyEvent = new amplitude.Identify();
    identifyEvent.set('network', network);

    ampli.client.identify(identifyEvent);
}
