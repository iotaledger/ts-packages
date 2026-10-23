// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type {
    GetOwnedObjectsParams,
    IotaClient,
    PaginatedObjectsResponse,
} from '@iota/iota-sdk/client';

/**
 * Returns the first page of owned objects that holds at least one object, or the last page if
 * none does. A page can be empty while more pages follow, so checking only the first page can
 * miss objects that exist.
 */
export async function getFirstOwnedObjectsPage(
    client: IotaClient,
    params: GetOwnedObjectsParams,
): Promise<PaginatedObjectsResponse> {
    let page = await client.getOwnedObjects(params);
    while (page.data.length === 0 && page.hasNextPage && page.nextCursor) {
        page = await client.getOwnedObjects({ ...params, cursor: page.nextCursor });
    }
    return page;
}
