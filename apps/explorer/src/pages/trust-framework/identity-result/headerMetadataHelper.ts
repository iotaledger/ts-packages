// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { IotaObjectData } from '@iota/iota-sdk/client';
import { IdentityPackageOfficial } from './views/IdentityPackageOfficial';

const IDENTITY_MODULE = 'identity';
const IDENTITY_METHOD = 'Identity';

const metadata = {
    legacyId: {
        label: 'Legacy ID',
    },
    type: {
        label: 'Type',
        badge: 'IOTA Identity',
    },
};

export function getIdentityType(didObject: IotaObjectData | null, pkgId: string) {
    if (!didObject || !didObject.type) {
        return null;
    }
    const tooltipText =
        'The method used to create and resolve this Identity. "IOTA Identity" is the Foundation\'s official identity framework, anchored onchain on IOTA L1.';

    const [_package, _module, _method] = didObject.type.split('::');
    if (_method === IDENTITY_METHOD && _module === IDENTITY_MODULE && _package === pkgId) {
        // Official Identity package for the current network
        return {
            label: metadata.type.label,
            value: IdentityPackageOfficial({ value: metadata.type.badge, copyValue: _package }),
            visible: true,
            tooltipText,
        };
    }

    return {
        label: metadata.type.label,
        value: didObject.type,
        visible: true,
        tooltipText,
    };
}

export function getLegacyMetadata(didObject: IotaObjectData | null) {
    if (!didObject) {
        return null;
    }

    if (didObject.content?.dataType !== 'moveObject') {
        return null;
    }

    if (!('legacy_id' in didObject.content.fields)) {
        return null;
    }

    const legacyId = didObject.content.fields.legacy_id;
    if (!legacyId) {
        return null;
    }

    return {
        label: metadata.legacyId.label,
        value: legacyId,
        visible: true,
    };
}
