// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { LoadingIndicator } from '@iota/apps-ui-kit';
import { useIotaClientQuery } from '@iota/dapp-kit';
import { JsonPanel } from './JsonPanel';

interface ObjectVersionContentsProps {
    objectId: string;
    version: string;
    label: string;
}

export function ObjectVersionContents({
    objectId,
    version,
    label,
}: ObjectVersionContentsProps): JSX.Element {
    const { data, isPending, isError } = useIotaClientQuery('tryGetPastObject', {
        id: objectId,
        version: Number(version),
        options: { showContent: true },
    });

    const fields =
        data?.status === 'VersionFound' && data.details.content?.dataType === 'moveObject'
            ? data.details.content.fields
            : undefined;

    return (
        <div className="flex w-0 min-w-full flex-col gap-xs py-sm">
            <span className="text-label-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                {label} (v{Number(version).toLocaleString()})
            </span>
            {isPending ? (
                <LoadingIndicator />
            ) : fields && !isError ? (
                <JsonPanel data={fields} />
            ) : (
                <span className="text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                    Contents for this version are not available.
                </span>
            )}
        </div>
    );
}
