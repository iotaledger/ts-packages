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

// Tracks whether we have already started waiting for human interaction, to
// prevent duplicate listener registration if initAmplitude is called again
// before the user interacts (e.g. on consent acceptance).
let humanWaitSetup = false;

// Holds the most-recently requested network identity so it can be applied
// after Amplitude finishes loading on first human interaction.
let pendingNetwork: string | null = null;

/**
 * Initialises Amplitude only after a genuine human interaction is detected.
 *
 * Strategy:
 * 1. Bail out immediately for WebDriver-controlled browsers (Selenium, etc.).
 * 2. Do NOT call ampli.load() yet — autocapture cannot queue events before
 *    Amplitude is initialised, so nothing can leak to the server.
 * 3. Listen for deliberate user gestures (pointerdown / keydown / touchstart).
 *    These signals are avoided by most bots and, crucially, are NOT fired
 *    automatically by browser scroll-position restoration (which was the
 *    root cause of the previous "scroll / mousemove" approach failing).
 * 4. On first gesture: load Amplitude normally, replay any pending identity,
 *    and register a pagehide beacon flush.
 */
export function initAmplitude(): void {
    const consentStatus = getAmplitudeConsentStatus();

    if (ampli.isLoaded || humanWaitSetup || consentStatus === 'declined') {
        return;
    }

    // Hard block for obvious automation frameworks that set navigator.webdriver.
    if (navigator.webdriver) {
        return;
    }

    humanWaitSetup = true;
    waitForHumanInteraction();
}

// Signals that require deliberate user intent and are not auto-dispatched by
// the browser or common headless-browser rendering pipelines.
// NOTE: 'scroll' is intentionally excluded — it fires automatically during
// browser scroll-position restoration. 'wheel' is used instead, as it only
// fires from physical hardware input and covers read-only scroll sessions.
// 'copy' covers the common explorer pattern of copying addresses/tx hashes
// without any click, and is never synthetically dispatched by crawlers.
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

/**
 * Set the Amplitude user identity with the current network context.
 * Updates user property: network.
 * This allows filtering and segmenting analytics events by network dimension.
 * If called before Amplitude is loaded (i.e. before first human interaction),
 * the value is stored and applied automatically when Amplitude initialises.
 */
export function setAmplitudeIdentity(network: string): void {
    pendingNetwork = network;

    if (!ampli.isLoaded) {
        return;
    }

    const identifyEvent = new amplitude.Identify();
    identifyEvent.set('network', network);

    ampli.client.identify(identifyEvent);
}
