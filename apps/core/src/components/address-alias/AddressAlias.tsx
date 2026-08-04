// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Copy, IotaLogoMark } from '@iota/apps-ui-icons';
import cx from 'clsx';
import { ButtonUnstyled } from '@iota/apps-ui-kit';
import { useAddressAliasLookup } from '../../hooks';
import { trimOrFormatAddress } from '@iota/iota-sdk/utils';
import { ImageIcon, ImageIconSize } from '../icon';

const COPY_BUTTON_GLUE_LENGTH = 4;

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
    noTruncate = false,
    truncateUnknown = false,
    onCopy,
    renderAddress,
    renderAlias,
    hideAlias = false,
}: AddressAliasProps): React.JSX.Element {
    const getAddressAlias = useAddressAliasLookup();

    const addressAlias = getAddressAlias(address);

    const addressToDisplay =
        noTruncate || !truncateUnknown ? address : trimOrFormatAddress(address);

    const copyButton = onCopy && (
        <ButtonUnstyled onClick={onCopy} className="ms-xxs inline-flex align-middle text-body-md">
            <Copy className="hover:text-opacity-80 transition-colors cursor-pointer text-iota-neutral-60 dark:text-iota-neutral-40" />
        </ButtonUnstyled>
    );

    const addressHead = addressToDisplay.slice(0, -COPY_BUTTON_GLUE_LENGTH);
    const addressTail = addressToDisplay.slice(-COPY_BUTTON_GLUE_LENGTH);

    return (
        <div className="flex flex-col gap-xxs">
            {!hideAlias && addressAlias && (
                <div
                    className={cx(
                        'flex min-w-0 items-center gap-xs text-iota-neutral-40 dark:text-iota-neutral-60',
                    )}
                >
                    <div className="h-5 w-5 shrink-0">
                        {addressAlias.imageUrl ? (
                            <ImageIcon
                                src={addressAlias.imageUrl}
                                label={addressAlias.alias}
                                fallback={addressAlias.alias}
                                size={ImageIconSize.Small}
                                rounded
                            />
                        ) : (
                            <IotaLogoMark className="h-full w-full" />
                        )}
                    </div>
                    <span className="min-w-0 flex-1 truncate">
                        {renderAlias?.(addressAlias.alias) ?? addressAlias.alias}
                    </span>
                </div>
            )}

            <div className={cx('break-all', { 'text-body-sm': !!addressAlias })}>
                {renderAddress ? (
                    renderAddress(addressToDisplay, copyButton, !!addressAlias)
                ) : (
                    <>
                        {addressHead}
                        <span className="whitespace-nowrap">
                            {addressTail}
                            {copyButton}
                        </span>
                    </>
                )}
            </div>
        </div>
    );
}
