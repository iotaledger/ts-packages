// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { AccountType, type SerializedUIAccount } from '_src/background/accounts/account';
import { Ledger, IotaLogoMark, Keystone, Passkey } from '@iota/apps-ui-icons';

interface AccountIconProps {
    account: SerializedUIAccount;
}

export function AccountIcon({ account }: AccountIconProps) {
    let LogoIcon = null;

    if (account.type === AccountType.LedgerDerived) {
        LogoIcon = Ledger;
    } else if (account.type === AccountType.KeystoneDerived) {
        LogoIcon = Keystone;
    } else if (account.type === AccountType.PasskeyDerived) {
        LogoIcon = Passkey;
    } else {
        LogoIcon = IotaLogoMark;
    }

    return (
        <div className="flex h-full w-full items-center justify-center bg-iota-primary-30 text-iota-neutral-100">
            <LogoIcon className="h-5 w-5" />
        </div>
    );
}
