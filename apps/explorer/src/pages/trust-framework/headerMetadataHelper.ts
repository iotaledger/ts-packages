// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { IotaObjectData } from '@iota/iota-sdk/client';
import { parseStructTag } from '@iota/iota-sdk/utils';
import { type OnChainNotarization } from '@iota/notarization/web';
// TODO: use '@iota/audit-trail/web' after published
import { type OnChainAuditTrail } from '@iota/audit-trail';
import { type MetaItem } from '~/components/ui/PageHeaderMeta';

const IDENTITY_MODULE = 'identity';
const IDENTITY_METHOD = 'Identity';
const NOTARIZATION_MODULE = 'notarization';
const NOTARIZATION_METHOD = 'Notarization';
const AUDIT_TRAIL_MODULE = 'main';
const AUDIT_TRAIL_METHOD = 'AuditTrail';

const metadata = {
    objectLegacyId: {
        label: 'Legacy ID',
        visible: true,
    },
    identityType: {
        label: 'Type',
        visible: true,
        badge: 'IOTA Identity',
    },
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
    auditTrailRecordsSize: {
        label: 'Records Size',
        visible: true,
    },
};

export class MetadataBuilder {
    items: MetaItem[];

    public constructor() {
        this.items = [];
    }

    static create(): MetadataBuilder {
        return new MetadataBuilder();
    }

    addItem(item: MetaItem | null): MetadataBuilder {
        if (item != null) {
            this.items.push(item);
        }
        return this;
    }

    build(): MetaItem[] {
        return this.items;
    }
}

/**
 * Determines the identity type of an IOTA DID object based on its type.
 *
 * @param didObject - The IOTA object data to analyze.
 * @param pkgId - The package ID to compare against for official identity package.
 * @returns A MetaItem object containing identity type information, or null if
 *          the objectData is null or has no type.
 */
export function getIdentityType(didObject: IotaObjectData | null, pkgId: string): MetaItem | null {
    if (didObject == null || didObject.type == null) {
        return null;
    }
    const tooltipText =
        'The method used to create and resolve this Identity. "IOTA Identity" is the Foundation\'s official identity framework, anchored onchain on IOTA L1.';

    const [_package, _module, _method] = didObject.type.split('::');
    if (_method === IDENTITY_METHOD && _module === IDENTITY_MODULE && _package === pkgId) {
        // Official Identity package for the current network
        return {
            label: metadata.identityType.label,
            value: metadata.identityType.badge,
            visible: metadata.identityType.visible,
            tooltipText,
        } as MetaItem;
    }

    return {
        label: metadata.identityType.label,
        value: didObject.type,
        visible: metadata.identityType.visible,
        tooltipText,
    } as MetaItem;
}

/**
 * Extracts legacy metadata from an IOTA DID object if available.
 *
 * @param didObject - The IOTA DID object data containing potential legacy ID information.
 * @returns A MetaItem containing the legacy ID if found, otherwise null.
 */
export function getLegacyMetadata(didObject: IotaObjectData | null): MetaItem | null {
    if (didObject == null) {
        return null;
    }

    if (didObject.content?.dataType !== 'moveObject') {
        return null;
    }

    if (!('legacy_id' in didObject.content.fields)) {
        return null;
    }

    const legacyId = didObject.content.fields.legacy_id;
    if (legacyId == null) {
        return null;
    }

    return {
        label: metadata.objectLegacyId.label,
        value: legacyId,
        visible: metadata.objectLegacyId.visible,
    } as MetaItem;
}

export function getNotarizationMethod(notarizationDocument: OnChainNotarization): MetaItem {
    return {
        label: metadata.notarizationMethod.label,
        value: notarizationDocument.method,
        visible: metadata.notarizationMethod.visible,
    };
}

/**
 * Determines the notarization type of an Notarization Object based on its type.
 *
 * @param notarizationObject - The IOTA object data to analyze.
 * @param pkgId - The package ID to compare against for official notarization package.
 * @returns A MetaItem object containing identity type information, or null if
 *          the objectData is null or has no type.
 */
export function getNotarizationType(
    notarizationObject: IotaObjectData | null,
    pkgId: string,
): MetaItem | null {
    if (notarizationObject == null || notarizationObject.type == null) {
        return null;
    }

    const tooltipText =
        'The method used to create and resolve this Notarization. "IOTA Notarization" is the Foundation\'s official notarization framework, anchored onchain on IOTA L1.';

    const {
        address: _package,
        module: _module,
        name: _method,
    } = parseStructTag(notarizationObject.type);
    if (_method === NOTARIZATION_METHOD && _module === NOTARIZATION_MODULE && _package === pkgId) {
        // Official Notarization package for the current network
        return {
            label: metadata.notarizationType.label,
            value: metadata.notarizationType.badge,
            visible: metadata.notarizationType.visible,
            tooltipText,
        } as MetaItem;
    }

    return {
        label: metadata.notarizationType.label,
        value: notarizationObject.type,
        visible: metadata.notarizationType.visible,
        tooltipText,
    } as MetaItem;
}

/**
 * Determines the audit trail type of an Audit Trail Object based on its type.
 *
 * @param auditTrailObject - The IOTA object data to analyze.
 * @param pkgId - The package ID to compare against for official audit trail package.
 * @returns A MetaItem object containing identity type information, or null if
 *          the objectData is null or has no type.
 */
export function getAuditTrailType(
    auditTrailObject: IotaObjectData | null,
    pkgId: string,
): MetaItem | null {
    if (auditTrailObject == null || auditTrailObject.type == null) {
        return null;
    }

    const tooltipText =
        'The method used to create and resolve this Audit Trail. "IOTA Audit Trail" is the Foundation\'s official audit trail framework, anchored onchain on IOTA L1.';

    const {
        address: _package,
        module: _module,
        name: _method,
    } = parseStructTag(auditTrailObject.type);

    if (_method === AUDIT_TRAIL_METHOD && _module === AUDIT_TRAIL_MODULE && _package === pkgId) {
        // Official Audit Trail package for the current network
        return {
            label: metadata.auditTrailType.label,
            value: metadata.auditTrailType.badge,
            visible: metadata.auditTrailType.visible,
            tooltipText,
        } as MetaItem;
    }

    return {
        label: metadata.auditTrailType.label,
        value: auditTrailObject.type,
        visible: metadata.auditTrailType.visible,
        tooltipText,
    } as MetaItem;
}

/**
 * Extracts the quantity of records from an OnChainAuditTrail object.
 *
 * @param auditTrail - The OnChainAuditTrail object.
 * @returns A MetaItem containing the quantity of records, or null if the object is null.
 */
export function getAuditTrailRecordsSize(auditTrail: OnChainAuditTrail | null): MetaItem | null {
    if (auditTrail == null) {
        return null;
    }

    return {
        label: metadata.auditTrailRecordsSize.label,
        value: auditTrail.records.size.toString(),
        visible: metadata.auditTrailRecordsSize.visible,
    } as MetaItem;
}
