// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

/** Replays messages as a server stream would deliver them. */
export async function* frames<T>(...messages: T[]): AsyncGenerator<T> {
    for (const message of messages) {
        yield message;
    }
}

export async function collect<T>(stream: AsyncIterable<T>): Promise<T[]> {
    const items: T[] = [];
    for await (const item of stream) {
        items.push(item);
    }
    return items;
}
