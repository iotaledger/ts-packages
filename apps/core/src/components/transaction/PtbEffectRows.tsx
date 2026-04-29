// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { CoinFormat, formatAddress } from '@iota/iota-sdk/utils';
import {
    Badge,
    BadgeType,
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
    KeyValueInfo,
    Panel,
    Title,
    TitleSize,
} from '@iota/apps-ui-kit';
import { Warning } from '@iota/apps-ui-icons';

import {
    type PtbRecognitionResult,
    type EffectRow,
} from '../../utils/transaction/recognizePtbEffects';
import { Collapsible } from '../collapsible';
import { useFormatCoin } from '../../hooks';

// ---------------------------------------------------------------------------
// Single row renderers
// ---------------------------------------------------------------------------

function CoinEffectRow({
    row,
}: {
    row: Extract<EffectRow, { kind: 'coin-send' | 'coin-receive' }>;
}) {
    const isSend = row.kind === 'coin-send';
    const [formatted, symbol] = useFormatCoin({
        balance: row.amount,
        coinType: row.coinType,
        format: CoinFormat.Full,
    });

    return (
        <div className="px-md py-xs">
            <KeyValueInfo
                keyText={isSend ? 'Sent' : 'Received'}
                value={`${isSend ? '-' : '+'}${formatted} ${symbol}`}
                supportingLabel={
                    isSend
                        ? `to ${formatAddress(row.recipient)}`
                        : row.sender
                          ? `from ${formatAddress(row.sender)}`
                          : undefined
                }
                fullwidth
            />
        </div>
    );
}

function NftEffectRow({
    row,
}: {
    row: Extract<EffectRow, { kind: 'transfer-nft' | 'receive-nft' }>;
}) {
    const isSend = row.kind === 'transfer-nft';
    return (
        <div className="flex items-center gap-x-sm px-md py-xs">
            {row.thumbnail && (
                <img
                    src={row.thumbnail}
                    alt={row.name}
                    className="h-8 w-8 flex-shrink-0 rounded object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
            )}
            <div className="min-w-0 flex-1">
                <KeyValueInfo
                    keyText={isSend ? 'Sent' : 'Received'}
                    value={row.name}
                    supportingLabel={
                        isSend
                            ? `to ${formatAddress(row.recipient)}`
                            : row.sender
                              ? `from ${formatAddress(row.sender)}`
                              : undefined
                    }
                    fullwidth
                />
            </div>
        </div>
    );
}

function PublishRow({ row }: { row: Extract<EffectRow, { kind: 'publish' | 'upgrade' }> }) {
    return (
        <div className="px-md py-xs">
            <KeyValueInfo
                keyText={row.kind === 'publish' ? 'Published package' : 'Upgraded package'}
                value={formatAddress(row.packageId)}
                fullwidth
            />
        </div>
    );
}

function CallRow({ row }: { row: Extract<EffectRow, { kind: 'call' | 'unknown-call' }> }) {
    return (
        <div className="px-md py-xs">
            <KeyValueInfo
                keyText="Called"
                value={`${row.module}::${row.fn}`}
                supportingLabel={formatAddress(row.packageId)}
                fullwidth
            />
        </div>
    );
}

function EffectRowItem({ row }: { row: EffectRow }) {
    switch (row.kind) {
        case 'coin-send':
        case 'coin-receive':
            return <CoinEffectRow row={row} />;
        case 'transfer-nft':
        case 'receive-nft':
            return <NftEffectRow row={row} />;
        case 'publish':
        case 'upgrade':
            return <PublishRow row={row} />;
        case 'call':
        case 'unknown-call':
            return <CallRow row={row} />;
    }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface PtbEffectRowsProps {
    recognition: PtbRecognitionResult;
}

export function PtbEffectRows({ recognition }: PtbEffectRowsProps) {
    const { rows } = recognition;
    if (!rows.length && recognition.recognized) return null;

    const title = recognition.recognized ? 'What happened' : 'What we can tell';

    return (
        <Panel hasBorder>
            <div className="flex flex-col overflow-hidden rounded-xl">
                <Collapsible
                    hideBorder
                    defaultOpen
                    render={() => (
                        <Title
                            size={TitleSize.Small}
                            title={title}
                            trailingElement={
                                rows.length > 0 ? (
                                    <div className="ml-1 flex">
                                        <Badge
                                            type={BadgeType.PrimarySoft}
                                            label={String(rows.length)}
                                        />
                                    </div>
                                ) : undefined
                            }
                        />
                    )}
                >
                    <div className="flex flex-col">
                        {rows.map((row, i) => (
                            <EffectRowItem key={i} row={row} />
                        ))}

                        {!recognition.recognized && (
                            <div className="px-md pb-md pt-xs">
                                <InfoBox
                                    type={InfoBoxType.Default}
                                    style={InfoBoxStyle.Default}
                                    title="Unverified app"
                                    supportingText="This app isn't recognized. Review the changes below carefully before approving."
                                    icon={<Warning />}
                                />
                            </div>
                        )}

                        {!recognition.recognized &&
                            recognition.structural.callCount > 0 &&
                            rows.length === 0 && (
                                <div className="px-md pb-xs">
                                    <KeyValueInfo
                                        keyText="Calls"
                                        value={`${recognition.structural.callCount} function${recognition.structural.callCount !== 1 ? 's' : ''} on ${recognition.structural.uniquePackages.length} package${recognition.structural.uniquePackages.length !== 1 ? 's' : ''}`}
                                        fullwidth
                                    />
                                    {recognition.structural.newObjects > 0 && (
                                        <KeyValueInfo
                                            keyText="Creates"
                                            value={`${recognition.structural.newObjects} new object${recognition.structural.newObjects !== 1 ? 's' : ''}`}
                                            fullwidth
                                        />
                                    )}
                                </div>
                            )}
                    </div>
                </Collapsible>
            </div>
        </Panel>
    );
}
