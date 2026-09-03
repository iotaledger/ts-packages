// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react';
import { type IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import {
    parseSerializedSignature,
    type PublicKey,
    type SignatureScheme,
} from '@iota/iota-sdk/cryptography';
import {
    MultiSigPublicKey,
    parsePartialSignatures,
    type MultiSigStruct,
} from '@iota/iota-sdk/multisig';
import { MoveAuthenticatorPublicKey } from '@iota/iota-sdk/keypairs/move-authenticator';
import { normalizeIotaAddress } from '@iota/iota-sdk/utils';
import { publicKeyFromRawBytes } from '@iota/iota-sdk/verify';

type NonMultiSigScheme = Exclude<SignatureScheme, 'MultiSig'>;

export type SignaturePubkeyPair = {
    signatureScheme: NonMultiSigScheme;
    signature: Uint8Array;
} & ({ address: string } | { publicKey: PublicKey });

export interface MultiSigParticipant {
    address: string;
    publicKey: PublicKey;
    signatureScheme: Exclude<NonMultiSigScheme, 'MoveAuthenticator'>;
    weight: number;
    signed: boolean;
    signature?: Uint8Array;
}

export interface MultiSigSignature {
    signatureScheme: 'MultiSig';
    /** The serialized top-level multisig signature. */
    signature: Uint8Array;
    /** The address derived from the complete multisig public key. */
    address: string;
    multisig: {
        address: string;
        threshold: number;
        bitmap: number;
        participants: MultiSigParticipant[];
    };
}

export type DeserializedSignature = SignaturePubkeyPair | MultiSigSignature;

function getSignatureAddress(signature: DeserializedSignature): string {
    return normalizeIotaAddress(
        'address' in signature ? signature.address : signature.publicKey.toIotaAddress(),
    );
}

function getSignatureFromAddress(signatures: DeserializedSignature[], iotaAddress: string) {
    return signatures.find(
        (signature) => getSignatureAddress(signature) === normalizeIotaAddress(iotaAddress),
    );
}

function getSignaturesExcludingAddress(
    signatures: DeserializedSignature[],
    iotaAddress: string,
): DeserializedSignature[] {
    return signatures.filter(
        (signature) => getSignatureAddress(signature) !== normalizeIotaAddress(iotaAddress),
    );
}

export interface UseDeserializedSignaturesResult {
    userSignatures: DeserializedSignature[];
    sponsorSignature: DeserializedSignature | null;
}

function getSignatureScheme(
    multisigPublicKey: MultiSigStruct['multisig_pk']['pk_map'][number],
): Exclude<NonMultiSigScheme, 'MoveAuthenticator'> {
    const scheme = Object.keys(multisigPublicKey.pubKey).find((key) => key !== '$kind');

    if (
        scheme !== 'ED25519' &&
        scheme !== 'Secp256k1' &&
        scheme !== 'Secp256r1' &&
        scheme !== 'Passkey'
    ) {
        throw new Error(`Unsupported multisig public key scheme: ${scheme ?? 'unknown'}`);
    }

    return scheme;
}

function getPartialSignatureScheme(
    signatureScheme: SignatureScheme,
): Exclude<NonMultiSigScheme, 'MoveAuthenticator'> {
    if (signatureScheme === 'MultiSig' || signatureScheme === 'MoveAuthenticator') {
        throw new Error(`Unsupported partial multisig signature scheme: ${signatureScheme}`);
    }

    return signatureScheme;
}

/**
 * Converts a serialized multisig into a top-level signature group. Keeping the
 * multisig intact is important: flattening it makes a 3-of-5 signature look
 * like three unrelated transaction signatures and loses the two participants
 * that have not signed yet.
 */
export function parseMultiSigSignature(
    multisig: MultiSigStruct,
    serializedSignature: Uint8Array,
): MultiSigSignature {
    const multisigPublicKey = new MultiSigPublicKey(multisig.multisig_pk);
    const signedParticipantIndices: number[] = [];

    for (let index = 0; index < multisig.multisig_pk.pk_map.length; index += 1) {
        if ((multisig.bitmap & (1 << index)) !== 0) {
            signedParticipantIndices.push(index);
        }
    }

    const partialSignatures = parsePartialSignatures(multisig);
    const participants = multisig.multisig_pk.pk_map.map((participant, index) => {
        const signedSignatureIndex = signedParticipantIndices.indexOf(index);
        const partialSignature =
            signedSignatureIndex >= 0 ? partialSignatures[signedSignatureIndex] : undefined;
        const publicKey = multisigPublicKey.getPublicKeys()[index].publicKey;

        return {
            address: publicKey.toIotaAddress(),
            publicKey,
            signatureScheme: partialSignature
                ? getPartialSignatureScheme(partialSignature.signatureScheme)
                : getSignatureScheme(participant),
            weight: participant.weight,
            signed: !!partialSignature,
            ...(partialSignature ? { signature: partialSignature.signature } : {}),
        };
    });
    const address = multisigPublicKey.toIotaAddress();

    return {
        signatureScheme: 'MultiSig',
        signature: serializedSignature,
        address,
        multisig: {
            address,
            threshold: multisig.multisig_pk.threshold,
            bitmap: multisig.bitmap,
            participants,
        },
    };
}

export function useDeserializedSignatures(
    transaction: IotaTransactionBlockResponse,
): UseDeserializedSignaturesResult {
    const sender = transaction.transaction?.data.sender;
    const gasData = transaction.transaction?.data.gasData;
    const transactionSignatures = transaction.transaction?.txSignatures;

    return useMemo(() => {
        if (!transactionSignatures) {
            return { userSignatures: [], sponsorSignature: null };
        }

        const isSponsoredTransaction = gasData?.owner !== sender;

        const deserializedTransactionSignatures: DeserializedSignature[] =
            transactionSignatures.map((signature) => {
                const parsed = parseSerializedSignature(signature);
                if (parsed.signatureScheme === 'MultiSig') {
                    return parseMultiSigSignature(parsed.multisig, parsed.bytes);
                }

                if (parsed.signatureScheme === 'MoveAuthenticator') {
                    const authenticatedObjectId =
                        parsed.moveAuthenticator.V1.objectToAuthenticate.Object?.$kind ===
                        'ImmOrOwnedObject'
                            ? parsed.moveAuthenticator.V1.objectToAuthenticate.Object
                                  .ImmOrOwnedObject.objectId
                            : parsed.moveAuthenticator.V1.objectToAuthenticate.Object?.$kind ===
                                'Receiving'
                              ? parsed.moveAuthenticator.V1.objectToAuthenticate.Object.Receiving
                                    .objectId
                              : parsed.moveAuthenticator.V1.objectToAuthenticate.Object
                                    ?.SharedObject?.objectId;
                    return {
                        ...parsed,
                        publicKey: new MoveAuthenticatorPublicKey(authenticatedObjectId!),
                    };
                }

                return {
                    ...parsed,
                    publicKey: publicKeyFromRawBytes(parsed.signatureScheme, parsed.publicKey),
                };
            });

        const userSignatures = isSponsoredTransaction
            ? getSignaturesExcludingAddress(deserializedTransactionSignatures, gasData!.owner)
            : deserializedTransactionSignatures;

        const sponsorSignature = isSponsoredTransaction
            ? (getSignatureFromAddress(deserializedTransactionSignatures, gasData!.owner) ?? null)
            : null;

        return { userSignatures, sponsorSignature };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transactionSignatures, gasData?.owner, sender]);
}
