// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Skeleton } from '@iota/apps-ui-kit';
import { type IotaObjectResponse } from '@iota/iota-sdk/client';
import { formatAddress } from '@iota/iota-sdk/utils';
import { LinkWithQuery, ObjectVideoImage } from '~/components/ui';
import { parseObjectType, trimStdLibPrefix } from '~/lib/utils';

function Thumbnail({ obj }: { obj: IotaObjectResponse }): JSX.Element {
    const displayMeta = obj.data?.display?.data;
    const src = displayMeta?.image_url || '';
    const name = displayMeta?.name ?? displayMeta?.description ?? '--';
    const type = trimStdLibPrefix(parseObjectType(obj));
    const id = obj.data?.objectId;

    return (
        <LinkWithQuery
            to={`/object/${encodeURI(id!)}`}
            className="block w-full max-w-[170px] rounded-xl p-xs hover:bg-iota-neutral-92 dark:hover:bg-iota-neutral-12"
        >
            <div className="flex flex-col gap-sm">
                <div className="aspect-square w-full overflow-hidden rounded-xl">
                    <ObjectVideoImage
                        disablePreview
                        title={name}
                        subtitle={type}
                        src={src}
                        variant="fill"
                        disableAutoPlay
                    />
                </div>
                <div className="flex min-w-0 flex-col gap-xxs px-xxs">
                    <span className="min-w-0 truncate text-label-md text-iota-neutral-10 dark:text-iota-neutral-92">
                        {name}
                    </span>
                    <span className="truncate text-label-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                        {formatAddress(id!)}
                    </span>
                </div>
            </div>
        </LinkWithQuery>
    );
}

function ThumbnailLoading(): JSX.Element {
    return (
        <div className="flex w-full max-w-[170px] flex-col gap-sm p-xs">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <div className="flex flex-col gap-xxs px-xxs">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
        </div>
    );
}

interface ThumbnailsViewViewProps {
    limit: number;
    data?: IotaObjectResponse[];
    loading?: boolean;
}

export function ThumbnailsView({ data, loading, limit }: ThumbnailsViewViewProps): JSX.Element {
    return (
        <div className="grid grid-cols-2 justify-items-center gap-xs overflow-auto sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {loading
                ? new Array(limit).fill(0).map((_, index) => <ThumbnailLoading key={index} />)
                : data?.map((obj) => <Thumbnail key={obj.data?.objectId} obj={obj} />)}
        </div>
    );
}
