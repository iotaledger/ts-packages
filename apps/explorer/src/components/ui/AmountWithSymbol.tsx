// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import clsx from 'clsx';
import { Fragment } from 'react';

interface AmountWithSymbolProps {
    amount: React.ReactNode;
    symbol?: React.ReactNode;
    className?: string;
}

export function AmountWithSymbol({
    amount,
    symbol,
    className,
}: AmountWithSymbolProps): React.JSX.Element {
    const chunks = typeof amount === 'string' ? amount.split(/(?<=,)/) : [amount];

    return (
        <div className={clsx('break-words', className)}>
            {chunks.map((chunk, index) => (
                <Fragment key={index}>
                    {chunk}
                    <wbr />
                </Fragment>
            ))}
            {symbol && (
                <>
                    {' '}
                    <span className="whitespace-nowrap text-label-md opacity-40">{symbol}</span>
                </>
            )}
        </div>
    );
}
