// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback } from 'react';
import { SearchBarType, Search as SearchBox } from '@iota/apps-ui-kit';

interface TableSearchProps {
    onSearch: (searchTerm: string) => void;
    placeholder?: string;
}

export function TableSearch({
    onSearch,
    placeholder = 'Search by name or address…',
}: TableSearchProps): JSX.Element {
    const [searchTerm, setSearchTerm] = useState('');

    const handleSearch = useCallback(
        (value: string) => {
            setSearchTerm(value);
            onSearch(value);
        },
        [onSearch],
    );

    return (
        <SearchBox
            searchValue={searchTerm}
            onSearchValueChange={handleSearch}
            placeholder={placeholder}
            isLoading={false}
            type={SearchBarType.Filled}
        />
    );
}
