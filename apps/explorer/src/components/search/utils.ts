// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

export function trimAuditTrailNotalizationSuffix(possibleDashedId: string): string {
    return possibleDashedId.replace(/-(audittrail|notarization)$/, '');
}
