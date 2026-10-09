// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useMemo, useState, useEffect } from 'react';
import { useGetOwnedObjects } from './useGetOwnedObjects';
import { useGetKioskContents } from './useGetKioskContents';
import { useIotaNamesClient } from '../contexts';
import { hasDisplayData } from '../utils/hasDisplayData';
import { getNameRegistrationType, getSubnameRegistrationType } from '@iota/iota-names-sdk';
import type { IotaObjectResponse } from '@iota/iota-sdk/client';
import type { KioskItem } from '@iota/kiosk';

const RPC_PAGE_SIZE = 50;

export enum OwnedObjectCategory {
    Nft = 'nft',
    Name = 'name',
    Kiosk = 'kiosk',
    Other = 'other',
}

interface VirtualPagination {
    currentPage: number;
    hasFirst: boolean;
    hasPrev: boolean;
    hasNext: boolean;
    onFirst: () => void;
    onPrev: () => void;
    onNext: () => void;
}

interface CategoryData<T> {
    data: T[];
    isFetching: boolean;
    isError: boolean;
    pagination: VirtualPagination;
}

interface CategorizedOwnedObjectsResult {
    nft: CategoryData<IotaObjectResponse>;
    name: CategoryData<IotaObjectResponse>;
    kiosk: CategoryData<KioskItem>;
    other: CategoryData<IotaObjectResponse>;
    availableCategories: OwnedObjectCategory[];
    activeCategory?: OwnedObjectCategory;
    isPending: boolean;
    isAnyError: boolean;
}

interface PageSource {
    hasNextPage: boolean;
    isFetching: boolean;
    isError: boolean;
    fetchNextPage: () => unknown;
}

function useLazyPagination<T>(
    items: T[],
    pageSize: number,
    pagination: PageSource,
    isActive: boolean,
    resetKey: string,
): CategoryData<T> {
    const [pageState, setPageState] = useState({ resetKey, page: 0 });
    const currentPage = pageState.resetKey === resetKey ? pageState.page : 0;

    const start = currentPage * pageSize;
    const needsMore = pagination.hasNextPage && items.length <= start + pageSize;
    const isFilling = isActive && needsMore;

    useEffect(() => {
        if (isFilling && !pagination.isFetching) {
            pagination.fetchNextPage();
        }
        // oxlint-disable-next-line react-hooks/exhaustive-deps
    }, [isFilling, pagination.isFetching, pagination.fetchNextPage]);

    const data = useMemo(() => items.slice(start, start + pageSize), [items, start, pageSize]);
    const hasNext = items.length > start + pageSize;

    const virtualPagination: VirtualPagination = useMemo(
        () => ({
            currentPage,
            hasFirst: currentPage > 0,
            hasPrev: currentPage > 0,
            hasNext,
            onFirst: () => setPageState({ resetKey, page: 0 }),
            onPrev: () => setPageState({ resetKey, page: Math.max(0, currentPage - 1) }),
            onNext: () => setPageState({ resetKey, page: currentPage + 1 }),
        }),
        [currentPage, hasNext, resetKey],
    );

    return {
        data,
        isFetching: isFilling,
        isError: pagination.isError,
        pagination: virtualPagination,
    };
}

export function useGetCategorizedOwnedObjects(
    address: string,
    pageSize: number = 50,
    selectedCategory?: OwnedObjectCategory,
): CategorizedOwnedObjectsResult {
    const { iotaNamesClient } = useIotaNamesClient();

    const nameTypes = useMemo(() => {
        try {
            const packageId = iotaNamesClient?.getPackage('packageId', 'v1');
            if (!packageId) return [];
            return [getNameRegistrationType(packageId), getSubnameRegistrationType(packageId)];
        } catch {
            // IOTA Names packages are not available on all networks (e.g. localnet)
            return [];
        }
    }, [iotaNamesClient]);

    const objectsQuery = useGetOwnedObjects(
        address,
        {
            MatchNone: [
                { StructType: '0x2::coin::Coin' },
                ...nameTypes.map((StructType) => ({ StructType })),
            ],
        },
        RPC_PAGE_SIZE,
    );

    const namesQuery = useGetOwnedObjects(
        nameTypes.length ? address : null,
        { MatchAny: nameTypes.map((StructType) => ({ StructType })) },
        RPC_PAGE_SIZE,
    );

    const {
        data: kioskData,
        isFetching: kioskFetching,
        isError: kioskError,
    } = useGetKioskContents(address);

    const { nftItems, otherItems } = useMemo(() => {
        const nft: IotaObjectResponse[] = [];
        const other: IotaObjectResponse[] = [];
        for (const obj of objectsQuery.data?.pages.flatMap((page) => page.data) ?? []) {
            (hasDisplayData(obj) ? nft : other).push(obj);
        }
        return { nftItems: nft, otherItems: other };
    }, [objectsQuery.data?.pages]);

    const nameItems = useMemo(
        () => namesQuery.data?.pages.flatMap((page) => page.data) ?? [],
        [namesQuery.data?.pages],
    );

    const kioskItems = useMemo(() => kioskData?.list ?? [], [kioskData?.list]);

    const objectsSource: PageSource = {
        hasNextPage: objectsQuery.hasNextPage,
        isFetching: objectsQuery.isFetching,
        isError: objectsQuery.isError,
        fetchNextPage: objectsQuery.fetchNextPage,
    };
    const namesSource: PageSource = {
        hasNextPage: namesQuery.hasNextPage,
        isFetching: namesQuery.isFetching,
        isError: namesQuery.isError,
        fetchNextPage: namesQuery.fetchNextPage,
    };
    const kioskSource: PageSource = {
        hasNextPage: false,
        isFetching: kioskFetching,
        isError: kioskError,
        fetchNextPage: () => {},
    };

    // NFT and Other share one unfiltered stream, so either may still appear in pages not yet fetched.
    const availableCategories = useMemo(() => {
        const category: OwnedObjectCategory[] = [];
        if (nftItems.length > 0 || objectsQuery.hasNextPage) category.push(OwnedObjectCategory.Nft);
        if (nameItems.length > 0) category.push(OwnedObjectCategory.Name);
        if (kioskItems.length > 0) category.push(OwnedObjectCategory.Kiosk);
        if (otherItems.length > 0 || objectsQuery.hasNextPage)
            category.push(OwnedObjectCategory.Other);
        return category;
    }, [
        nftItems.length,
        nameItems.length,
        kioskItems.length,
        otherItems.length,
        objectsQuery.hasNextPage,
    ]);

    const isPending = objectsQuery.isLoading || namesQuery.isLoading || kioskFetching;

    const categoryItems = {
        [OwnedObjectCategory.Nft]: {
            count: nftItems.length,
            hasNextPage: objectsQuery.hasNextPage,
        },
        [OwnedObjectCategory.Name]: {
            count: nameItems.length,
            hasNextPage: namesQuery.hasNextPage,
        },
        [OwnedObjectCategory.Kiosk]: { count: kioskItems.length, hasNextPage: false },
        [OwnedObjectCategory.Other]: {
            count: otherItems.length,
            hasNextPage: objectsQuery.hasNextPage,
        },
    };

    const defaultCategory =
        availableCategories.find((category) => {
            const { count, hasNextPage } = categoryItems[category];
            return count > 0 && (count > pageSize || !hasNextPage);
        }) ?? availableCategories[0];
    const activeCategory = isPending
        ? undefined
        : selectedCategory && availableCategories.includes(selectedCategory)
          ? selectedCategory
          : defaultCategory;

    const resetKey = `${address}-${pageSize}`;

    const nft = useLazyPagination(
        nftItems,
        pageSize,
        objectsSource,
        activeCategory === OwnedObjectCategory.Nft,
        resetKey,
    );
    const name = useLazyPagination(
        nameItems,
        pageSize,
        namesSource,
        activeCategory === OwnedObjectCategory.Name,
        resetKey,
    );
    const kiosk = useLazyPagination(kioskItems, pageSize, kioskSource, false, resetKey);
    const other = useLazyPagination(
        otherItems,
        pageSize,
        objectsSource,
        activeCategory === OwnedObjectCategory.Other,
        resetKey,
    );

    return {
        nft,
        name,
        kiosk,
        other,
        availableCategories: isPending ? [] : availableCategories,
        activeCategory,
        isPending,
        isAnyError: objectsQuery.isError || namesQuery.isError || kioskError,
    };
}
