// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Badge, BadgeSize, BadgeType, Panel } from '@iota/apps-ui-kit';
import { ImageIcon, ImageIconSize } from '../icon';

export type DAppEntry = {
    name: string;
    description: string;
    link: string;
    icon: string;
    tags: string[];
};

interface DAppListItemProps {
    name: string;
    icon?: string;
    description: string;
    link: string;
    tags?: string[];
}

export function DAppListItem({ name, icon, description, link, tags }: DAppListItemProps) {
    return (
        <Panel hasBorder>
            <div className="dark:hover:bg-shader-primary-dark-8 flex h-full flex-col rounded-xl hover:bg-shader-primary-light-8">
                <div className="item-center box-border flex gap-sm rounded-2xl p-sm">
                    <ImageIcon
                        src={icon || null}
                        label={name}
                        fallback={name}
                        size={ImageIconSize.Medium}
                    />
                    <div className="flex flex-col justify-center gap-xxs">
                        <span className="text-label-lg dark:text-iota-neutral-92 text-iota-neutral-10">
                            {name}
                        </span>
                        <span className="text-body-sm text-iota-primary-30 dark:text-iota-primary-80">
                            {link}
                        </span>
                    </div>
                </div>
                <div className="dark:text-iota-neutral-60 flex flex-col gap-y-md px-sm py-xs text-body-sm text-iota-neutral-40">
                    <div>{description}</div>
                    <div className="flex flex-wrap gap-x-xxs">
                        {tags?.map((tag) => (
                            <Badge
                                key={tag}
                                label={tag}
                                size={BadgeSize.Small}
                                type={
                                    tag === 'Official' ? BadgeType.PrimarySoft : BadgeType.Neutral
                                }
                            />
                        ))}
                    </div>
                </div>
            </div>
        </Panel>
    );
}
