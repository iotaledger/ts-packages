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

function formatFunctionSummary(
    functions: { module: string; fn: string; count: number }[],
): string | undefined {
    if (!functions.length) return undefined;

    const summary = functions
        .slice(0, 3)
        .map(({ module, fn, count }) => `${module}::${fn}${count > 1 ? ` x${count}` : ''}`)
        .join(' · ');

    return functions.length > 3 ? `${summary} · +${functions.length - 3} more` : summary;
}

function formatObjectActivity(
    recognition: Extract<PtbRecognitionResult, { recognized: false }>,
): string {
    const { objectChanges } = recognition.structural;
    const parts = [
        objectChanges.created > 0 ? `${objectChanges.created} created` : null,
        objectChanges.transferred > 0 ? `${objectChanges.transferred} transferred` : null,
        objectChanges.mutated > 0 ? `${objectChanges.mutated} mutated` : null,
        objectChanges.unwrapped > 0 ? `${objectChanges.unwrapped} unwrapped` : null,
        objectChanges.published > 0 ? `${objectChanges.published} published` : null,
    ].filter(Boolean);

    return parts.join(' · ');
}

function getDisplayedRows(recognition: PtbRecognitionResult): EffectRow[] {
    if (recognition.recognized) return recognition.rows;

    return recognition.rows.filter((row) => row.kind !== 'call' && row.kind !== 'unknown-call');
}

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
    const kioskLabel = row.kioskId ? `from kiosk ${formatAddress(row.kioskId)}` : 'from kiosk';
    const supportingLabel = isSend
        ? row.source === 'kiosk'
            ? `${kioskLabel} to ${formatAddress(row.recipient)}`
            : `to ${formatAddress(row.recipient)}`
        : row.source === 'kiosk'
          ? row.sender
              ? `${kioskLabel} · sender ${formatAddress(row.sender)}`
              : kioskLabel
          : row.sender
            ? `from ${formatAddress(row.sender)}`
            : undefined;

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
                    supportingLabel={supportingLabel}
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
    const displayedRows = getDisplayedRows(recognition);
    if (!displayedRows.length && recognition.recognized) return null;

    const title = recognition.recognized ? 'What happened' : 'What we can tell';
    const trailingCount = recognition.recognized
        ? displayedRows.length
        : displayedRows.length + recognition.structural.packages.length;
    const objectActivity = !recognition.recognized ? formatObjectActivity(recognition) : undefined;
    const hasUnknownPackages =
        !recognition.recognized && recognition.structural.packages.some((pkg) => !pkg.isKnown);

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
                                trailingCount > 0 ? (
                                    <div className="ml-1 flex">
                                        <Badge
                                            type={BadgeType.PrimarySoft}
                                            label={String(trailingCount)}
                                        />
                                    </div>
                                ) : undefined
                            }
                        />
                    )}
                >
                    <div className="flex flex-col">
                        {displayedRows.map((row, i) => (
                            <EffectRowItem key={i} row={row} />
                        ))}

                        {!recognition.recognized && (
                            <>
                                {recognition.structural.callCount > 0 && (
                                    <div className="px-md py-xs">
                                        <KeyValueInfo
                                            keyText="Contract activity"
                                            value={`${recognition.structural.callCount} function${recognition.structural.callCount !== 1 ? 's' : ''} on ${recognition.structural.packages.length} package${recognition.structural.packages.length !== 1 ? 's' : ''}`}
                                            fullwidth
                                        />
                                    </div>
                                )}

                                {recognition.structural.packages.map((pkg) => (
                                    <div key={pkg.packageId} className="px-md py-xs">
                                        <KeyValueInfo
                                            keyText={pkg.isKnown ? 'Package' : 'Unverified package'}
                                            value={formatAddress(pkg.packageId)}
                                            supportingLabel={`${pkg.callCount} call${pkg.callCount !== 1 ? 's' : ''}${formatFunctionSummary(pkg.functions) ? ` · ${formatFunctionSummary(pkg.functions)}` : ''}`}
                                            fullwidth
                                        />
                                    </div>
                                ))}

                                {objectActivity && (
                                    <div className="px-md py-xs">
                                        <KeyValueInfo
                                            keyText="Object changes"
                                            value={objectActivity}
                                            fullwidth
                                        />
                                    </div>
                                )}

                                <div className="px-md pb-md pt-xs">
                                    <InfoBox
                                        type={
                                            hasUnknownPackages
                                                ? InfoBoxType.Warning
                                                : InfoBoxType.Default
                                        }
                                        style={InfoBoxStyle.Default}
                                        title={
                                            hasUnknownPackages ? 'Unverified app' : 'Review details'
                                        }
                                        supportingText={
                                            hasUnknownPackages
                                                ? "This app isn't recognized. Review the changes below carefully before approving."
                                                : 'Some steps could not be simplified. Review the wallet effects and raw commands if needed.'
                                        }
                                        icon={<Warning />}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </Collapsible>
            </div>
        </Panel>
    );
}
