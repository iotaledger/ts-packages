// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

// Styling for the region a field row unfolds into, so the object fields and
// dynamic fields lists stay identical.
export const EXPANDABLE_FIELD_REGION_CLASSES =
    'ml-xs flex flex-col gap-md border-x border-iota-neutral-92 px-md py-md dark:border-iota-neutral-12';

// Plain-language explanations of the object state fields, shown as tooltips.
export const OBJECT_FIELD_TOOLTIP = {
    objectId:
        'The unique identifier of this object. It is assigned when the object is created and never changes, even if the object is transferred or updated.',
    version:
        'Every change to an object raises its version number. The numbers are not consecutive, so gaps between versions are normal.',
    digest: 'A fingerprint of this exact version of the object. Any change to its contents produces a different one.',
    owner: 'Determines who can use this object: a single address, anyone at all if it is shared, or nobody if it is immutable and can no longer change. Objects can also be held inside another object.',
    lastTransaction: 'The most recent transaction that changed this object.',
    publisher: 'The address that sent the transaction publishing this package.',
    published: 'When this version of the package was published on the network.',
    storageRebate:
        'IOTA held as a deposit for the storage this object uses. It is paid back when the object is deleted or gets smaller.',
} as const;
