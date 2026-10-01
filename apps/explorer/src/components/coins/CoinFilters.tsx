// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ButtonSegment, SegmentedButton } from '@iota/apps-ui-kit';

export type CoinFilter = 'All' | 'Recognized' | 'Not Recognized';

const COIN_FILTERS: CoinFilter[] = ['All', 'Recognized', 'Not Recognized'];

interface CoinFiltersProps {
    selectedFilter: CoinFilter;
    onFilterChange: (filter: CoinFilter) => void;
}

export function CoinFilters({ selectedFilter, onFilterChange }: CoinFiltersProps): JSX.Element {
    return (
        <SegmentedButton>
            {COIN_FILTERS.map((filter) => (
                <ButtonSegment
                    key={filter}
                    label={filter}
                    selected={filter === selectedFilter}
                    onClick={() => onFilterChange(filter)}
                />
            ))}
        </SegmentedButton>
    );
}
