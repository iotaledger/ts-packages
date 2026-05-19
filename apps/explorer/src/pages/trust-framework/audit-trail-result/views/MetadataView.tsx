// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Title, TooltipPosition } from '@iota/apps-ui-kit';
// TODO: use '@iota/audit-trail/web' after published
import { type ImmutableMetadata, type OnChainAuditTrail } from '@iota/audit-trail';
import { Panel, PanelGroup } from 'react-resizable-panels';
import { ErrorBoundary, SyntaxHighlighter } from '~/components';

interface MetadataViewProps {
    auditTrail: OnChainAuditTrail;
}

interface LabelledSyntaxHighlighterProps {
    label: string;
    code: string;
    language: string;
}

function LabelledSyntaxHighlighter({ label, code, language }: LabelledSyntaxHighlighterProps) {
    return (
        <div className="flex flex-col">
            <SyntaxHighlighter code={code} language={language} />
            <span className="mt-1 text-body-sm text-gray-500 dark:text-gray-400">{label}</span>
        </div>
    );
}

export function MetadataView({ auditTrail }: MetadataViewProps) {
    const immutableMetadata = auditTrail.immutableMetadata;
    const updatableMetadata = auditTrail.updatableMetadata;

    return (
        <ErrorBoundary>
            <div className="panel-bg flex w-full flex-col gap-sm--rs rounded-xl border border-transparent">
                <PanelGroup direction="horizontal">
                    <UpdatableMetadataPanel metadata={updatableMetadata} />
                </PanelGroup>
                <PanelGroup direction="horizontal">
                    <ImmutableMetadataPanel metadata={immutableMetadata} />
                </PanelGroup>
            </div>
        </ErrorBoundary>
    );
}

function ImmutableMetadataPanel({ metadata }: { metadata?: ImmutableMetadata }) {
    return (
        <Panel defaultSize={50} minSize={20}>
            <div className="flex w-full flex-col gap-sm">
                <Title
                    title="Immutable Metadata"
                    tooltipPosition={TooltipPosition.Left}
                    tooltipText="The immutable metadata of this Audit Trail. This data cannot be changed."
                />
                <div className="flex flex-col gap-y-md">
                    <LabelledSyntaxHighlighter
                        label="Name (Text)"
                        code={metadata?.name ?? ''}
                        language="text"
                    />
                    <LabelledSyntaxHighlighter
                        label="Description (Text)"
                        code={metadata?.description ?? ''}
                        language="text"
                    />
                </div>
            </div>
        </Panel>
    );
}

function UpdatableMetadataPanel({ metadata }: { metadata?: string }) {
    return (
        <Panel defaultSize={50} minSize={20}>
            <div className="flex w-full flex-col gap-sm">
                <Title
                    title="Updatable Metadata"
                    tooltipPosition={TooltipPosition.Left}
                    tooltipText="The updatable metadata of this Audit Trail. This data can be changed by authorized actors."
                />
                <LabelledSyntaxHighlighter
                    label="Metadata (Text)"
                    code={metadata ?? ''}
                    language="text"
                />
            </div>
        </Panel>
    );
}
