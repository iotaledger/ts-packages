// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { MessageInitShape } from '@bufbuild/protobuf';
import type { ValueSchema } from '@bufbuild/protobuf/wkt';
import { NullValue } from '@bufbuild/protobuf/wkt';
import { fromBase58, fromBase64 } from '@iota/bcs';
import type { TypeTag } from '@iota/iota-sdk/bcs';
import { bcs, TypeTagSerializer } from '@iota/iota-sdk/bcs';
import { TransactionDataBuilder } from '@iota/iota-sdk/transactions';

import { UserSignature } from './bcs/signatures.js';
import { SignatureConversionError } from './errors.js';
import type { InputArgumentSchema } from './proto/iota/grpc/v1/command_pb.js';
import type { UserSignatureSchema } from './proto/iota/grpc/v1/signatures_pb.js';
import type { TypeTagSchema } from './proto/iota/grpc/v1/types_pb.js';

/** `TransactionData` BCS, as the bytes `Transaction.build` returns or the base64 `signTransaction` does. */
export type TransactionBytes = Uint8Array | string;

export type SignedTransaction = {
    transaction: TransactionBytes;
    /** Serialized signatures in base64, as `signTransaction` returns them. */
    signatures: readonly string[];
};

export type SimulateTransactionInput = {
    transaction: TransactionBytes;
    /** Relaxes the node's Move VM checks, for debugging and development. */
    skipChecks?: boolean;
};

/**
 * A call argument as JSON, for the node to encode against the parameter's Move type. Numbers go
 * over the wire as strings, so pass a `bigint` for an integer a `number` cannot hold exactly.
 */
export type ViewArgument =
    | null
    | boolean
    | number
    | bigint
    | string
    | readonly ViewArgument[]
    | { readonly [key: string]: ViewArgument };

export type ViewFunctionCall = {
    /** `<package>::<module>::<function>`. The function must be declared `#[view]`. */
    fqFunctionName: string;
    /** Type arguments such as `0x2::iota::IOTA` or `vector<u8>`, in declaration order. */
    typeArgs?: readonly string[];
    /** In declaration order. A `Uint8Array` goes as BCS the caller encoded, anything else as JSON. */
    args?: readonly (ViewArgument | Uint8Array)[];
};

const PRIMITIVE_TYPE_TAGS = {
    bool: 'boolTag',
    u8: 'u8Tag',
    u16: 'u16Tag',
    u32: 'u32Tag',
    u64: 'u64Tag',
    u128: 'u128Tag',
    u256: 'u256Tag',
    address: 'addressTag',
    signer: 'signerTag',
} as const;

/** Rejects bytes that are not a `TransactionData` before hashing them into the digest. */
export function protoTransaction(transaction: TransactionBytes) {
    let data: Uint8Array;
    try {
        data = typeof transaction === 'string' ? fromBase64(transaction) : transaction;
        bcs.TransactionData.parse(data);
    } catch {
        throw new TypeError('invalid transaction: not BCS-encoded TransactionData');
    }

    return {
        digest: { digest: fromBase58(TransactionDataBuilder.getDigestFromBytes(data)) },
        bcs: { data },
    };
}

export function protoUserSignature(
    signature: string,
): MessageInitShape<typeof UserSignatureSchema> {
    let data: Uint8Array;
    try {
        data = UserSignature.serialize(signature).toBytes();
    } catch (error) {
        throw new SignatureConversionError((error as Error).message);
    }

    return { bcs: { data } };
}

export function protoTypeTag(typeTag: string): MessageInitShape<typeof TypeTagSchema> {
    let parsed: TypeTag;
    try {
        parsed = TypeTagSerializer.parseFromStr(typeTag, true);
    } catch {
        throw new TypeError(`invalid type tag: ${typeTag}`);
    }

    return fromTypeTag(parsed);
}

export function protoInputArgument(
    argument: ViewArgument | Uint8Array,
): MessageInitShape<typeof InputArgumentSchema> {
    return argument instanceof Uint8Array
        ? { input: { case: 'bcs', value: { data: argument } } }
        : { input: { case: 'json', value: protoJsonValue(argument) } };
}

/** Like Rust's `json_to_prost_stringify_numbers`: `Value` holds numbers as doubles, so they go as strings. */
export function protoJsonValue(value: ViewArgument): MessageInitShape<typeof ValueSchema> {
    switch (typeof value) {
        case 'boolean':
            return { kind: { case: 'boolValue', value } };
        case 'string':
            return { kind: { case: 'stringValue', value } };
        case 'bigint':
            return { kind: { case: 'stringValue', value: value.toString() } };
        case 'number':
            if (!Number.isSafeInteger(value)) {
                throw new TypeError(`${value} is not a safe integer: pass a bigint instead`);
            }
            return { kind: { case: 'stringValue', value: value.toString() } };
    }

    if (value === null) {
        return { kind: { case: 'nullValue', value: NullValue.NULL_VALUE } };
    }

    if (isArgumentList(value)) {
        return { kind: { case: 'listValue', value: { values: value.map(protoJsonValue) } } };
    }

    const fields = Object.fromEntries(
        Object.entries(value).map(([key, field]) => [key, protoJsonValue(field)]),
    );
    return { kind: { case: 'structValue', value: { fields } } };
}

function fromTypeTag(tag: TypeTag): MessageInitShape<typeof TypeTagSchema> {
    if ('vector' in tag) {
        return { typeTag: { case: 'vectorTag', value: { innerType: fromTypeTag(tag.vector) } } };
    }

    if ('struct' in tag) {
        return {
            typeTag: {
                case: 'structTag',
                value: { structTag: TypeTagSerializer.tagToString(tag) },
            },
        };
    }

    const [primitive] = Object.keys(tag) as (keyof typeof PRIMITIVE_TYPE_TAGS)[];
    return { typeTag: { case: PRIMITIVE_TYPE_TAGS[primitive], value: true } };
}

/** `Array.isArray` narrows to `any[]`, which drops the element type of a readonly array. */
function isArgumentList(value: ViewArgument): value is readonly ViewArgument[] {
    return Array.isArray(value);
}
