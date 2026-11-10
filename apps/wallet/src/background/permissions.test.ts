// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { Permission } from '_payloads/permissions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Runtime } from 'webextension-polyfill';

import { ContentScriptConnection } from './connections/contentScriptConnection';
import Permissions from './permissions';

const { storage, windowRemovedListeners } = vi.hoisted(() => ({
    storage: new Map<string, unknown>(),
    windowRemovedListeners: new Set<(windowId: number) => void>(),
}));

vi.mock('webextension-polyfill', () => ({
    default: {
        runtime: {
            getURL: (path: string) => `chrome-extension://test-id/${path}`,
        },
        storage: {
            local: {
                get: async (defaults: Record<string, unknown>) =>
                    Object.fromEntries(
                        Object.entries(defaults).map(([key, value]) => [
                            key,
                            storage.has(key) ? structuredClone(storage.get(key)) : value,
                        ]),
                    ),
                set: async (values: Record<string, unknown>) => {
                    Object.entries(values).forEach(([key, value]) =>
                        storage.set(key, structuredClone(value)),
                    );
                },
            },
        },
        windows: {
            getLastFocused: async () => ({}),
            create: async () => ({ id: POPUP_WINDOW_ID }),
            onRemoved: {
                addListener: (listener: (windowId: number) => void) =>
                    windowRemovedListeners.add(listener),
                removeListener: (listener: (windowId: number) => void) =>
                    windowRemovedListeners.delete(listener),
            },
        },
    },
}));

vi.mock('./tabs', async () => {
    const { Subject } = await import('rxjs');
    return { default: { onRemoved: new Subject() } };
});

vi.mock('./accounts', () => ({}));
vi.mock('./transactions', () => ({ default: {} }));

const POPUP_WINDOW_ID = 42;
const ORIGIN = 'https://dapp.test';
const REQUEST_MSG_ID = 'request-msg-id';

const noopEvent = { addListener: () => {}, removeListener: () => {} };

function createConnection() {
    const postMessage = vi.fn();
    const port = {
        name: ContentScriptConnection.CHANNEL,
        sender: { origin: ORIGIN, url: `${ORIGIN}/` },
        postMessage,
        onMessage: noopEvent,
        onDisconnect: noopEvent,
    } as unknown as Runtime.Port;
    return { connection: new ContentScriptConnection(port), postMessage };
}

function getStoredPermission() {
    return (storage.get('permissions') as Record<string, Permission>)[ORIGIN];
}

function closePopupWindow() {
    windowRemovedListeners.forEach((listener) => listener(POPUP_WINDOW_ID));
}

describe('Permissions', () => {
    beforeEach(() => {
        storage.clear();
    });

    it('rejects the connection request when the permission popup is closed', async () => {
        const { connection, postMessage } = createConnection();

        await Permissions.startRequestPermissions(['viewAccount'], connection, REQUEST_MSG_ID);
        closePopupWindow();

        await vi.waitFor(() =>
            expect(postMessage).toHaveBeenCalledWith({
                id: REQUEST_MSG_ID,
                payload: { error: true, code: -1, message: 'Permission rejected' },
            }),
        );
        expect(postMessage).toHaveBeenCalledTimes(1);
        expect(getStoredPermission().allowed).toBe(false);
    });

    it('does not reject the connection request when the popup is closed after approving', async () => {
        const { connection, postMessage } = createConnection();
        const subscription = Permissions.permissionReply.subscribe();

        await Permissions.startRequestPermissions(['viewAccount'], connection, REQUEST_MSG_ID);
        Permissions.handlePermissionResponse({
            type: 'permission-response',
            id: getStoredPermission().id,
            accounts: ['0x1'],
            allowed: true,
            responseDate: new Date().toISOString(),
        });
        await vi.waitFor(() => expect(getStoredPermission().allowed).toBe(true));

        closePopupWindow();

        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(postMessage).not.toHaveBeenCalled();
        expect(getStoredPermission().allowed).toBe(true);
        subscription.unsubscribe();
    });
});
