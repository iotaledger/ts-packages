// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { IotaClient, NetworkId } from '@iota/iota-sdk/client';
import type { TransactionObjectArgument } from '@iota/iota-sdk/transactions';

import type { BaseRulePackageIds } from '../constants.js';
import type { IotaGraphQLClient } from '@iota/iota-sdk/graphql';

export * from './kiosk.js';
export * from './transfer-policy.js';

/**
 * A valid argument for any of the Kiosk functions.
 */
export type ObjectArgument = string | TransactionObjectArgument;

/**
 * The Client Options for Both KioskClient & TransferPolicyManager.
 */
export type KioskClientOptions = {
    client: IotaClient;
    graphQlClient?: IotaGraphQLClient | null;
    network: NetworkId;
    packageIds?: BaseRulePackageIds;
};
