// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { BcsType } from '@iota/bcs';
import { bcs } from '@iota/iota-sdk/bcs';

const MoveLocation = bcs.struct('MoveLocation', {
    package: bcs.Address,
    module: bcs.string(),
    function: bcs.u16(),
    instruction: bcs.u16(),
    functionName: bcs.option(bcs.string()),
});

const CommandArgumentError = bcs.enum('CommandArgumentError', {
    TypeMismatch: null,
    InvalidBcsBytes: null,
    InvalidUsageOfPureArgument: null,
    InvalidArgumentToPrivateEntryFunction: null,
    IndexOutOfBounds: bcs.struct('IndexOutOfBounds', { index: bcs.u16() }),
    SecondaryIndexOutOfBounds: bcs.struct('SecondaryIndexOutOfBounds', {
        result: bcs.u16(),
        subresult: bcs.u16(),
    }),
    InvalidResultArity: bcs.struct('InvalidResultArity', { result: bcs.u16() }),
    InvalidGasCoinUsage: null,
    InvalidValueUsage: null,
    InvalidObjectByValue: null,
    InvalidObjectByMutRef: null,
    SharedObjectOperationNotAllowed: null,
    InvalidArgumentArity: null,
});

const TypeArgumentError = bcs.enum('TypeArgumentError', {
    TypeNotFound: null,
    ConstraintNotSatisfied: null,
});

const PackageUpgradeError = bcs.enum('PackageUpgradeError', {
    UnableToFetchPackage: bcs.struct('UnableToFetchPackage', { packageId: bcs.Address }),
    NotAPackage: bcs.struct('NotAPackage', { objectId: bcs.Address }),
    IncompatibleUpgrade: null,
    DigestDoesNotMatch: bcs.struct('DigestDoesNotMatch', { digest: bcs.ObjectDigest }),
    UnknownUpgradePolicy: bcs.struct('UnknownUpgradePolicy', { policy: bcs.u8() }),
    PackageIdDoesNotMatch: bcs.struct('PackageIdDoesNotMatch', {
        packageId: bcs.Address,
        ticketId: bcs.Address,
    }),
});

const ObjectSize = bcs.struct('ObjectSize', {
    objectSize: bcs.u64(),
    maxObjectSize: bcs.u64(),
});

const ValueSize = bcs.struct('ValueSize', {
    valueSize: bcs.u64(),
    maxScaledSize: bcs.u64(),
});

// `MoveAuthentication` nests an ExecutionError. The annotation breaks the
// type-level cycle, at the cost of typing the nested error as unknown.
const NestedExecutionError: BcsType<unknown, any> = bcs.lazy(() => ExecutionError);

export const ExecutionError = bcs.enum('ExecutionError', {
    InsufficientGas: null,
    InvalidGasObject: null,
    InvariantViolation: null,
    FeatureNotYetSupported: null,
    ObjectTooBig: ObjectSize,
    PackageTooBig: ObjectSize,
    CircularObjectOwnership: bcs.struct('CircularObjectOwnership', { object: bcs.Address }),
    InsufficientCoinBalance: null,
    CoinBalanceOverflow: null,
    PublishErrorNonZeroAddress: null,
    IotaMoveVerificationError: null,
    MovePrimitiveRuntimeError: bcs.struct('MovePrimitiveRuntimeError', {
        location: bcs.option(MoveLocation),
    }),
    MoveAbort: bcs.struct('MoveAbort', { location: MoveLocation, code: bcs.u64() }),
    VmVerificationOrDeserializationError: null,
    VmInvariantViolation: null,
    FunctionNotFound: null,
    ArityMismatch: null,
    TypeArityMismatch: null,
    NonEntryFunctionInvoked: null,
    CommandArgumentError: bcs.struct('CommandArgumentError', {
        argument: bcs.u16(),
        kind: CommandArgumentError,
    }),
    TypeArgumentError: bcs.struct('TypeArgumentError', {
        typeArgument: bcs.u16(),
        kind: TypeArgumentError,
    }),
    UnusedValueWithoutDrop: bcs.struct('UnusedValueWithoutDrop', {
        result: bcs.u16(),
        subresult: bcs.u16(),
    }),
    InvalidPublicFunctionReturnType: bcs.struct('InvalidPublicFunctionReturnType', {
        index: bcs.u16(),
    }),
    InvalidTransferObject: null,
    EffectsTooLarge: bcs.struct('EffectsTooLarge', {
        currentSize: bcs.u64(),
        maxSize: bcs.u64(),
    }),
    PublishUpgradeMissingDependency: null,
    PublishUpgradeDependencyDowngrade: null,
    PackageUpgradeError: bcs.struct('PackageUpgradeError', { kind: PackageUpgradeError }),
    WrittenObjectsTooLarge: ObjectSize,
    CertificateDenied: null,
    IotaMoveVerificationTimeout: null,
    SharedObjectOperationNotAllowed: null,
    InputObjectDeleted: null,
    ExecutionCanceledDueToSharedObjectCongestion: bcs.struct(
        'ExecutionCanceledDueToSharedObjectCongestion',
        { congestedObjects: bcs.vector(bcs.Address) },
    ),
    AddressDeniedForCoin: bcs.struct('AddressDeniedForCoin', {
        address: bcs.Address,
        coinType: bcs.string(),
    }),
    CoinTypeGlobalPause: bcs.struct('CoinTypeGlobalPause', { coinType: bcs.string() }),
    ExecutionCanceledDueToRandomnessUnavailable: null,
    ExecutionCanceledDueToSharedObjectCongestionV2: bcs.struct(
        'ExecutionCanceledDueToSharedObjectCongestionV2',
        { congestedObjects: bcs.vector(bcs.Address), suggestedGasPrice: bcs.u64() },
    ),
    InvalidLinkage: null,
    MoveAuthentication: bcs.struct('MoveAuthentication', { error: NestedExecutionError }),
    ExecutionCanceledDueToExecutionWorkerCongestion: bcs.struct(
        'ExecutionCanceledDueToExecutionWorkerCongestion',
        { suggestedGasPrice: bcs.u64() },
    ),
    MoveVectorElemTooBig: ValueSize,
    MoveRawValueTooBig: ValueSize,
});

export type ExecutionError = typeof ExecutionError.$inferType;
