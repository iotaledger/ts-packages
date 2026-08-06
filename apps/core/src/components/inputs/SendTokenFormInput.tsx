// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ButtonPill, Input, InputType } from '@iota/apps-ui-kit';
import { CoinMetadata, CoinStruct, type Network } from '@iota/iota-sdk/client';
import { IOTA_COIN_METADATA, useBalanceInUSD, useFormatCoin } from '../../hooks';
import { useField, useFormikContext } from 'formik';
import { TokenForm } from '../../forms';
import { CoinFormat, IOTA_TYPE_ARG, parseAmount } from '@iota/iota-sdk/utils';
import { useIotaClientContext } from '@iota/dapp-kit';
import { formatBalanceToUSD } from '../../utils';

export interface SendTokenInputProps {
    coins: CoinStruct[];
    coinType: string;
    onActionClick: () => Promise<void>;
    isMaxActionDisabled?: boolean;
    name: string;
    totalGas?: string;
    coinMetadata?: CoinMetadata | null;
}

export function SendTokenFormInput({
    coins,
    coinType,
    onActionClick,
    isMaxActionDisabled,
    name,
    totalGas,
    coinMetadata,
}: SendTokenInputProps) {
    const { values, isSubmitting, validateField } = useFormikContext<TokenForm>();
    const { network } = useIotaClientContext();

    const coinDecimals = coinMetadata?.decimals ?? 0;
    const symbol = coinMetadata?.symbol ?? IOTA_COIN_METADATA.symbol;

    const parsedAmount = parseAmount(values.amount, coinDecimals);
    const amountInUSD = useBalanceInUSD(coinType, parsedAmount, network as Network);
    const hasFiatValue =
        parsedAmount > 0n &&
        amountInUSD !== null &&
        amountInUSD !== undefined &&
        Math.abs(amountInUSD) >= 0.005;

    const [formattedGasBudgetEstimation, gasToken] = useFormatCoin({
        balance: totalGas,
        format: CoinFormat.Full,
    });

    const [field, meta, helpers] = useField<string>(name);
    const errorMessage =
        coinMetadata === null ? 'There was an error fetching the coin metadata' : meta.error;
    const isActionButtonDisabled = isSubmitting || isMaxActionDisabled;

    const gasAmount = formattedGasBudgetEstimation
        ? formattedGasBudgetEstimation + ' ' + gasToken
        : undefined;

    const totalBalance = coins.reduce((acc, { balance }) => {
        return BigInt(acc) + BigInt(balance);
    }, BigInt(0));

    const approximation = parsedAmount === totalBalance && coinType === IOTA_TYPE_ARG;

    return (
        <Input
            type={InputType.NumericFormat}
            name={field.name}
            onBlur={field.onBlur}
            value={field.value}
            caption="Est. Gas Fees:"
            placeholder="0.00"
            label="Send Amount"
            suffix={` ${symbol}`}
            prefix={approximation ? '~ ' : undefined}
            allowNegative={false}
            errorMessage={errorMessage}
            amountCounter={!errorMessage ? (coins ? gasAmount : '--') : undefined}
            supportingValue={
                !errorMessage && hasFiatValue
                    ? `~ ${formatBalanceToUSD(amountInUSD as number)}`
                    : undefined
            }
            trailingElement={
                <ButtonPill disabled={isActionButtonDisabled} onClick={onActionClick}>
                    Max
                </ButtonPill>
            }
            decimalScale={coinDecimals ? undefined : 0}
            thousandSeparator
            onValueChange={async (values) => {
                await helpers.setValue(values.value);
                validateField(name);
            }}
        />
    );
}
