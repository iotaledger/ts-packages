// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { getOption } from '@bufbuild/protobuf';
import type { DescField, DescMessage } from '@bufbuild/protobuf';

import { field_mask_transparent } from '../src/proto/iota/grpc/options_pb.js';

/**
 * What the server validates a read mask against. Usually a proto message, but
 * `GetCheckpoint` validates against a synthetic root with one field per frame
 * kind, which exists only on the server.
 */
export type ReadMaskTarget = DescMessage | Record<string, DescMessage>;

function isDescMessage(target: ReadMaskTarget): target is DescMessage {
    return 'kind' in target && target.kind === 'message';
}

function childMessage(field: DescField): DescMessage | undefined {
    if (field.fieldKind === 'message') return field.message;
    if (field.fieldKind === 'list' && field.listKind === 'message') return field.message;
    return undefined;
}

/**
 * Mirrors `FieldMaskUtil::validate` in `iota-sdk-grpc-types`: a oneof name is a
 * virtual parent at the root only, any key after a map is valid, and a
 * `field_mask_transparent` message passes the rest of the path to its map.
 */
function isValidPath(message: DescMessage, segments: string[], atRoot: boolean): boolean {
    const [head, ...rest] = segments;

    const field = message.fields.find((f) => f.name === head);
    if (field) {
        if (rest.length === 0 || field.fieldKind === 'map') {
            return true;
        }

        const child = childMessage(field);

        if (!child) {
            return false;
        }

        if (getOption(child, field_mask_transparent)) {
            return true;
        }

        return isValidPath(child, rest, false);
    }

    if (atRoot && message.oneofs.some((o) => o.name === head)) {
        return rest.length === 0 || isValidPath(message, rest, false);
    }

    return false;
}

/** The first path the server would reject, or `undefined` if it accepts them all. */
export function findInvalidReadMaskPath(
    target: ReadMaskTarget,
    paths: readonly string[],
): string | undefined {
    return paths.find((path) => {
        if (path === '*') {
            return false;
        }

        const segments = path.split('.');

        if (isDescMessage(target)) {
            return !isValidPath(target, segments, true);
        }

        const [head, ...rest] = segments;
        const root = target[head];

        return !root || (rest.length > 0 && !isValidPath(root, rest, false));
    });
}
