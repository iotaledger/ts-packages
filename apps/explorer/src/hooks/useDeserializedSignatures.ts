// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react';
import { type IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import {
    parseSerializedSignature,
    type PublicKey,
    type SignatureScheme,
} from '@iota/iota-sdk/cryptography';
import { parsePartialSignatures } from '@iota/iota-sdk/multisig';
import { MoveAuthenticatorPublicKey } from '@iota/iota-sdk/keypairs/move-authenticator';
import { normalizeIotaAddress } from '@iota/iota-sdk/utils';
import { publicKeyFromRawBytes } from '@iota/iota-sdk/verify';

export type SignaturePubkeyPair = {
    signatureScheme: SignatureScheme;
    signature: Uint8Array;
} & ({ address: string } | { publicKey: PublicKey });

function getSignatureFromAddress(signatures: SignaturePubkeyPair[], iotaAddress: string) {
    return signatures.find(
        (signature) =>
            ('address' in signature ? signature.address : signature.publicKey.toIotaAddress()) ===
            normalizeIotaAddress(iotaAddress),
    );
}

function getSignaturesExcludingAddress(
    signatures: SignaturePubkeyPair[],
    iotaAddress: string,
): SignaturePubkeyPair[] {
    return signatures.filter(
        (signature) =>
            ('address' in signature ? signature.address : signature.publicKey.toIotaAddress()) !==
            normalizeIotaAddress(iotaAddress),
    );
}

interface UseDeserializedSignaturesResult {
    userSignatures: SignaturePubkeyPair[];
    sponsorSignature: SignaturePubkeyPair | null;
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

        const deserializedTransactionSignatures = transactionSignatures
            .map((signature) => {
                const parsed = parseSerializedSignature(signature);
                if (parsed.signatureScheme === 'MultiSig') {
                    return parsePartialSignatures(parsed.multisig);
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
            })
            .flat();

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
