// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

// apps/explorer/src/pages/trust-framework/audit-trail-result/mockCapabilities.ts

export interface Capability {
    holderAddress: string;
    role: string;
    status: 'active' | 'revoked';
    validFrom: Date | null;
    validUntil: Date | null;
}

export const mockCapabilities: Capability[] = [
    {
        holderAddress: '0x1234567890123456789012345678901234567890',
        role: 'Admin',
        status: 'active',
        validFrom: new Date('2023-01-01'),
        validUntil: new Date('2025-01-01'),
    },
    {
        holderAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        role: 'Auditor',
        status: 'active',
        validFrom: new Date(),
        validUntil: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 days from now
    },
    {
        holderAddress: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        role: 'Viewer',
        status: 'revoked',
        validFrom: null,
        validUntil: null,
    },
    {
        holderAddress: '0x1111111111111111111111111111111111111111',
        role: 'Contributor',
        status: 'active',
        validFrom: new Date('2022-01-01'),
        validUntil: new Date('2023-01-01'),
    },
    {
        holderAddress: '0x2222222222222222222222222222222222222222',
        role: 'Editor',
        status: 'active',
        validFrom: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 days from now
        validUntil: new Date(new Date().setDate(new Date().getDate() + 60)), // 60 days from now
    },
    {
        holderAddress: '0x3333333333333333333333333333333333333333',
        role: 'Admin',
        status: 'active',
        validFrom: new Date('2023-01-01'),
        validUntil: new Date('2025-01-01'),
    },
    {
        holderAddress: '0x4444444444444444444444444444444444444444',
        role: 'Auditor',
        status: 'revoked',
        validFrom: new Date(),
        validUntil: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 days from now
    },
    {
        holderAddress: '0x5555555555555555555555555555555555555555',
        role: 'Viewer',
        status: 'active',
        validFrom: null,
        validUntil: null,
    },
    {
        holderAddress: '0x6666666666666666666666666666666666666666',
        role: 'Contributor',
        status: 'active',
        validFrom: new Date('2022-01-01'),
        validUntil: new Date('2023-01-01'),
    },
    {
        holderAddress: '0x7777777777777777777777777777777777777777',
        role: 'Editor',
        status: 'revoked',
        validFrom: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 days from now
        validUntil: new Date(new Date().setDate(new Date().getDate() + 60)), // 60 days from now
    },
    {
        holderAddress: '0x8888888888888888888888888888888888888888',
        role: 'Admin',
        status: 'active',
        validFrom: new Date('2023-01-01'),
        validUntil: new Date('2025-01-01'),
    },
    {
        holderAddress: '0x9999999999999999999999999999999999999999',
        role: 'Auditor',
        status: 'active',
        validFrom: new Date(),
        validUntil: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 days from now
    },
    {
        holderAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        role: 'Viewer',
        status: 'revoked',
        validFrom: null,
        validUntil: null,
    },
    {
        holderAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        role: 'Contributor',
        status: 'active',
        validFrom: new Date('2022-01-01'),
        validUntil: new Date('2023-01-01'),
    },
    {
        holderAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
        role: 'Editor',
        status: 'active',
        validFrom: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 days from now
        validUntil: new Date(new Date().setDate(new Date().getDate() + 60)), // 60 days from now
    },
    {
        holderAddress: '0xdddddddddddddddddddddddddddddddddddddddd',
        role: 'Admin',
        status: 'revoked',
        validFrom: new Date('2023-01-01'),
        validUntil: new Date('2025-01-01'),
    },
    {
        holderAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        role: 'Auditor',
        status: 'active',
        validFrom: new Date(),
        validUntil: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 days from now
    },
    {
        holderAddress: '0xffffffffffffffffffffffffffffffffffffffff',
        role: 'Viewer',
        status: 'active',
        validFrom: null,
        validUntil: null,
    },
    {
        holderAddress: '0x0000000000000000000000000000000000000001',
        role: 'Contributor',
        status: 'revoked',
        validFrom: new Date('2022-01-01'),
        validUntil: new Date('2023-01-01'),
    },
    {
        holderAddress: '0x0000000000000000000000000000000000000002',
        role: 'Editor',
        status: 'active',
        validFrom: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 days from now
        validUntil: new Date(new Date().setDate(new Date().getDate() + 60)), // 60 days from now
    },
];
