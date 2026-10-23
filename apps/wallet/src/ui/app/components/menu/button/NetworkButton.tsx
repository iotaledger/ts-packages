// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Button, ButtonSize, ButtonType } from '@iota/apps-ui-kit';
import { Globe } from '@iota/apps-ui-icons';
import { useNextMenuUrl } from '_components';
import { Link } from 'react-router-dom';

export function NetworkButton() {
    const networkUrl = useNextMenuUrl(true, '/network');

    return (
        <Link className="flex cursor-pointer" aria-label="Change network" to={networkUrl}>
            <Button
                type={ButtonType.Ghost}
                size={ButtonSize.Small}
                icon={<Globe className="h-5 w-5" />}
                testId="wallet-network-button"
            />
        </Link>
    );
}
