// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Badge, BadgeSize, BadgeType } from '@iota/apps-ui-kit';
import { Search as SearchIcon } from '@iota/apps-ui-icons';

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
const SHORTCUT_LABEL = isMac ? '⌘K' : 'Ctrl K';

interface SearchButtonProps {
    onClick: () => void;
}

export function SearchButton({ onClick }: SearchButtonProps): JSX.Element {
    return (
        <div className="relative">
            <button
                type="button"
                onClick={onClick}
                aria-label="Open search"
                className="button-border-color-outline state-layer flex flex-row items-center gap-2 rounded-full bg-transparent px-md py-[6.5px] transition-all duration-150 ease-in"
            >
                <SearchIcon className="button-text-color-neutral h-5 w-5" />
                <span className="hidden md:block">
                    <Badge type={BadgeType.Neutral} size={BadgeSize.Small} label={SHORTCUT_LABEL} />
                </span>
            </button>
        </div>
    );
}
