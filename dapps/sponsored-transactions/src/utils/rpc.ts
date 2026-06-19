// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { getRpcUrl, IotaClient } from '@iota/iota-sdk/client';

export const client = new IotaClient({ url: getRpcUrl('testnet') });
