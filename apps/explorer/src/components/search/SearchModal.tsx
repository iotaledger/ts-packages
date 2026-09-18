// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Dialog, DialogContent } from '@iota/apps-ui-kit';
import { Search } from './Search';

interface SearchModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps): JSX.Element {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseOnOverlay isFixedPosition customWidth="w-[720px] max-w-[92vw]">
                <div className="flex min-h-[420px] flex-1 flex-col gap-xl p-lg">
                    <Search autoFocus onSelectResult={() => onOpenChange(false)} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
