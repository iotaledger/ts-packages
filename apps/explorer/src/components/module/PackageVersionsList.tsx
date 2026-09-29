// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { InfoBox, InfoBoxStyle, InfoBoxType, LoadingIndicator } from '@iota/apps-ui-kit';
import { Info } from '@iota/apps-ui-icons';
import { usePackageVersions } from '~/hooks';
import { TableCard } from '~/components/ui';
import { generatePackageVersionsTableColumns } from '~/lib/ui';

interface PackageVersionsListProps {
    packageId: string;
}

export function PackageVersionsList({ packageId }: PackageVersionsListProps): JSX.Element {
    const { data: versions, isPending, isError } = usePackageVersions(packageId);

    if (isPending) {
        return (
            <div className="flex w-full justify-center py-md">
                <LoadingIndicator />
            </div>
        );
    }

    if (isError || !versions?.length) {
        return (
            <div className="flex justify-center py-md text-body-md text-iota-neutral-40">
                No version history available for this package
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-md">
            {versions.length === 1 && (
                <InfoBox
                    supportingText="Every version of this package has been published to this same address, so there are no earlier addresses to visit."
                    icon={<Info />}
                    type={InfoBoxType.Default}
                    style={InfoBoxStyle.Elevated}
                />
            )}
            <TableCard data={versions} columns={generatePackageVersionsTableColumns(packageId)} />
        </div>
    );
}
