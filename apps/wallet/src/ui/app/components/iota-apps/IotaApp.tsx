// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ImageIcon, ImageIconSize, DAppListItem, type DAppEntry } from '@iota/core';
import { ExternalLink } from '_components';
import { ampli } from '_src/shared/analytics/ampli';
import { getDAppUrl } from '_src/shared/utils';
import { useState } from 'react';
import { Card, CardImage, CardBody, ImageShape, CardType } from '@iota/apps-ui-kit';
import { DisconnectApp } from './DisconnectApp';

export type { DAppEntry };
export type DisplayType = 'full' | 'card';

interface CardViewProps {
    name: string;
    link: string;
    icon?: string;
}

function CardView({ name, link, icon }: CardViewProps) {
    const appUrl = getDAppUrl(link);
    const originLabel = appUrl.hostname;
    return (
        <Card type={CardType.Outlined}>
            <CardImage shape={ImageShape.SquareRounded}>
                <ImageIcon
                    src={icon || null}
                    label={name}
                    fallback={name}
                    rounded={false}
                    size={ImageIconSize.Medium}
                />
            </CardImage>
            <CardBody isTextTruncated title={name} subtitle={originLabel} />
        </Card>
    );
}

export interface IotaAppProps {
    name: string;
    description: string;
    link: string;
    icon: string;
    tags: string[];
    permissionID?: string;
    displayType: DisplayType;
    openAppSite?: boolean;
}

export function IotaApp({
    name,
    description,
    link,
    icon,
    tags,
    permissionID,
    displayType,
    openAppSite,
}: IotaAppProps) {
    const [showDisconnectApp, setShowDisconnectApp] = useState(false);
    const appUrl = getDAppUrl(link);

    if (permissionID && showDisconnectApp) {
        return (
            <DisconnectApp
                name={name}
                link={link}
                icon={icon}
                permissionID={permissionID}
                setShowDisconnectApp={setShowDisconnectApp}
            />
        );
    }

    const AppDetails =
        displayType === 'full' ? (
            <DAppListItem name={name} description={description} icon={icon} tags={tags} />
        ) : (
            <CardView name={name} link={link} icon={icon} />
        );

    if (permissionID && !openAppSite) {
        return (
            <div onClick={() => setShowDisconnectApp(true)} role="button">
                {AppDetails}
            </div>
        );
    }

    return (
        <ExternalLink
            href={appUrl?.toString() ?? link}
            title={name}
            className="no-underline"
            onClick={() => {
                ampli.openedApplication({ applicationName: name });
            }}
            trackEvent={false}
        >
            {AppDetails}
        </ExternalLink>
    );
}
