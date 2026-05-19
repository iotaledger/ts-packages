// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Permission } from '@iota/audit-trail';

export const permissionMap = new Map<number, string>([
    [Permission.DeleteAuditTrail, 'DeleteAuditTrail'],
    [Permission.DeleteAllRecords, 'DeleteAllRecords'],
    [Permission.AddRecord, 'AddRecord'],
    [Permission.DeleteRecord, 'DeleteRecord'],
    [Permission.CorrectRecord, 'CorrectRecord'],
    [Permission.UpdateLockingConfig, 'UpdateLockingConfig'],
    [Permission.UpdateLockingConfigForDeleteRecord, 'UpdateLockingConfigForDeleteRecord'],
    [Permission.UpdateLockingConfigForDeleteTrail, 'UpdateLockingConfigForDeleteTrail'],
    [Permission.UpdateLockingConfigForWrite, 'UpdateLockingConfigForWrite'],
    [Permission.AddRoles, 'AddRoles'],
    [Permission.UpdateRoles, 'UpdateRoles'],
    [Permission.DeleteRoles, 'DeleteRoles'],
    [Permission.AddCapabilities, 'AddCapabilities'],
    [Permission.RevokeCapabilities, 'RevokeCapabilities'],
    [Permission.UpdateMetadata, 'UpdateMetadata'],
    [Permission.DeleteMetadata, 'DeleteMetadata'],
    [Permission.Migrate, 'Migrate'],
    [Permission.AddRecordTags, 'AddRecordTags'],
    [Permission.DeleteRecordTags, 'DeleteRecordTags'],
]);

export function getPermissionName(code: number): string {
    return permissionMap.get(code) ?? 'UnknownPermission';
}
