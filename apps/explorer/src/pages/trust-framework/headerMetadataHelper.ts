// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { IotaObjectData } from '@iota/iota-sdk/client';
import { parseStructTag } from '@iota/iota-sdk/utils';
import { truncateStruct } from '~/lib/utils';
import { type OnChainNotarization } from '@iota/notarization/web';
import { type OnChainAuditTrail } from '@iota/audit-trails/web';

const NOTARIZATION_MODULE = 'notarization';
const NOTARIZATION_METHOD = 'Notarization';
const AUDIT_TRAIL_MODULE = 'main';
const AUDIT_TRAIL_METHOD = 'AuditTrail';

const metadata = {
    notarizationMethod: {
        label: 'Method',
        visible: true,
    },
    notarizationType: {
        label: 'Type',
        visible: true,
        badge: 'IOTA Notarization',
    },
    auditTrailType: {
        label: 'Type',
        visible: true,
        badge: 'IOTA Audit Trail',
    },
};

export function getNotarizationMethod(notarizationDocument: OnChainNotarization) {
    return {
        label: metadata.notarizationMethod.label,
        value: notarizationDocument.method,
        visible: metadata.notarizationMethod.visible,
    };
}

export function getNotarizationType(notarizationObject: IotaObjectData | null, pkgId: string) {
    if (!notarizationObject || !notarizationObject.type) {
        return null;
    }

    const tooltipText =
        'The method used to create and resolve this Notarization. "IOTA Notarization" is the Foundation\'s official notarization framework, anchored onchain on IOTA L1.';

    const {
        address: _package,
        module: _module,
        name: _method,
    } = parseStructTag(notarizationObject.type);
    const isOfficialFramework =
        _method === NOTARIZATION_METHOD && _module === NOTARIZATION_MODULE && _package === pkgId;

    return {
        label: metadata.notarizationType.label,
        value: isOfficialFramework
            ? metadata.notarizationType.badge
            : truncateStruct(notarizationObject.type),
        structTag: notarizationObject.type,
        visible: metadata.notarizationType.visible,
        tooltipText,
    };
}

export function getAuditTrailType(auditTrailObject: IotaObjectData | null, pkgId: string) {
    if (!auditTrailObject || !auditTrailObject.type) {
        return null;
    }

    const tooltipText =
        'The method used to create and resolve this Audit Trail. "IOTA Audit Trail" is the Foundation\'s official audit trail framework, anchored onchain on IOTA L1.';

    const {
        address: _package,
        module: _module,
        name: _method,
    } = parseStructTag(auditTrailObject.type);

    const isOfficialFramework =
        _method === AUDIT_TRAIL_METHOD && _module === AUDIT_TRAIL_MODULE && _package === pkgId;

    return {
        label: metadata.auditTrailType.label,
        value: isOfficialFramework
            ? metadata.auditTrailType.badge
            : truncateStruct(auditTrailObject.type),
        structTag: auditTrailObject.type,
        visible: metadata.auditTrailType.visible,
        tooltipText,
    };
}

export function getAuditTrailRecordsSize(auditTrail: OnChainAuditTrail | null) {
    if (!auditTrail) {
        return null;
    }

    return auditTrail.records.size.toString();
}
