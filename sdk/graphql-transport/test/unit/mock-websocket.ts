// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter } from 'node:events';

export interface MockSocket extends EventEmitter {
    url: string;
    protocol?: string;
    sent: Record<string, unknown>[];
    closeCalls: number;
    closed: boolean;
    addEventListener: (type: string, listener: (...args: never[]) => void) => void;
    close: () => void;
    send: (raw: string) => void;
}

export interface MockWebSocketHarness {
    WebSocketConstructor: typeof WebSocket;
    sockets: MockSocket[];
    latest: () => MockSocket;
    /** Stop (or resume) answering `connection_init`, to drive the unacknowledged paths. */
    setAck: (ack: boolean) => void;
}

/**
 * The graphql-ws handshake gates everything: until the server answers `connection_init`
 * with `connection_ack` no `subscribe` frame is sent and `subscribe()` never settles.
 */
export function createMockWebSocket({ ack = true }: { ack?: boolean } = {}): MockWebSocketHarness {
    const sockets: MockSocket[] = [];
    const state = { ack };

    const WebSocketConstructor = function (url: string, protocol?: string) {
        const socket = new EventEmitter() as MockSocket;
        socket.url = url;
        socket.protocol = protocol;
        socket.sent = [];
        socket.closeCalls = 0;
        socket.closed = false;
        socket.addEventListener = socket.addListener.bind(
            socket,
        ) as unknown as MockSocket['addEventListener'];

        socket.close = () => {
            socket.closeCalls += 1;
            // A real socket fires `close` after `close()`, but closing an already-closed
            // socket is a no-op and fires nothing.
            if (socket.closed) return;
            socket.closed = true;
            setTimeout(() => socket.emit('close'), 0);
        };

        socket.send = (raw: string) => {
            const message = JSON.parse(raw) as Record<string, unknown>;
            socket.sent.push(message);
            if (message.type === 'connection_init' && state.ack) {
                queueMicrotask(() => emitServerMessage(socket, { type: 'connection_ack' }));
            }
        };

        sockets.push(socket);
        setTimeout(() => socket.emit('open'), 0);
        return socket;
    } as unknown as typeof WebSocket;

    return {
        WebSocketConstructor,
        sockets,
        latest: () => sockets[sockets.length - 1],
        setAck: (value: boolean) => {
            state.ack = value;
        },
    };
}

export function emitServerMessage(socket: MockSocket, message: unknown): void {
    socket.emit('message', { data: JSON.stringify(message) });
}

/** An unsolicited server-side drop, as opposed to one the client asked for. */
export function emitClose(socket: MockSocket): void {
    if (socket.closed) return;
    socket.closed = true;
    socket.emit('close');
}

export function framesOfType(socket: MockSocket, type: string): Record<string, unknown>[] {
    return socket.sent.filter((message) => message.type === type);
}

export function tick(ms = 0): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
