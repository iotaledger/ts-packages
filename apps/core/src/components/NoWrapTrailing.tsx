// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

interface NoWrapTrailingProps {
    text: string;
    trailing: React.ReactNode;
}

export function NoWrapTrailing({ text, trailing }: NoWrapTrailingProps): React.JSX.Element {
    return (
        <>
            {text.slice(0, -1)}
            <span className="whitespace-nowrap">
                {text.slice(-1)}
                {trailing}
            </span>
        </>
    );
}
