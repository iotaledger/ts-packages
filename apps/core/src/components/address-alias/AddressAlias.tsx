// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Copy } from '@iota/apps-ui-icons';
import cx from 'clsx';
import { ButtonUnstyled } from '@iota/apps-ui-kit';
import { NoWrapTrailing } from '../NoWrapTrailing';
import { AddressAliasIcon } from './AddressAliasIcon';
import { useAddressAlias } from './useAddressAlias';

interface AddressAliasProps {
    address: string;
    noTruncate?: boolean;
    truncateUnknown?: boolean;
    onCopy?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    renderAddress?: (
        addressToDisplay: string,
        copyButton: React.ReactNode,
        hasAlias: boolean,
    ) => React.ReactNode;
    renderAlias?: (addressAlias: string) => React.ReactNode;
    hideAlias?: boolean;
}

export function AddressAlias({
    address,
    noTruncate,
    truncateUnknown,
    onCopy,
    renderAddress,
    renderAlias,
    hideAlias = false,
}: AddressAliasProps): React.JSX.Element {
    const { addressAlias, addressToDisplay } = useAddressAlias({
        address,
        noTruncate,
        truncateUnknown,
    });
    const showAlias = !hideAlias && !!addressAlias;

    const copyButton = onCopy && (
        <ButtonUnstyled onClick={onCopy} className="ms-xxs inline-flex align-middle text-body-md">
            <Copy className="hover:text-opacity-80 transition-colors cursor-pointer text-iota-neutral-60 dark:text-iota-neutral-40" />
        </ButtonUnstyled>
    );

    return (
        <div className="flex flex-col gap-xxs">
            {showAlias && (
                <div className="flex min-w-0 items-center gap-xs text-iota-neutral-40 dark:text-iota-neutral-60">
                    <AddressAliasIcon addressAlias={addressAlias} />
                    <span className="min-w-0 flex-1 truncate">
                        {renderAlias?.(addressAlias.alias) ?? addressAlias.alias}
                    </span>
                </div>
            )}

            <div className={cx('break-all', { 'text-body-sm': showAlias })}>
                {renderAddress ? (
                    renderAddress(addressToDisplay, copyButton, !!addressAlias)
                ) : (
                    <NoWrapTrailing text={addressToDisplay} trailing={copyButton} />
                )}
            </div>
        </div>
    );
}
