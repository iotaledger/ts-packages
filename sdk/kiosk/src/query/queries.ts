// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { graphql } from '@iota/iota-sdk/graphql/schemas/latest';
import type { ResultOf } from '@iota/iota-sdk/graphql/schemas/latest';

export const TRANSFER_POLICY_QUERY = graphql(`
    query TransferPolicy($filter: ObjectFilter) {
        objects(filter: $filter) {
            nodes {
                owner {
                    __typename
                    ... on AddressOwner {
                        owner {
                            address
                        }
                    }
                    ... on Parent {
                        parent {
                            address
                        }
                    }
                    ... on Shared {
                        initialSharedVersion
                    }
                }
                asMoveObject {
                    contents {
                        bcs
                    }
                }
                address
            }
        }
    }
`);

export type GraphQLOwner = ResultOf<
    typeof TRANSFER_POLICY_QUERY
>['objects']['nodes'][number]['owner'];
