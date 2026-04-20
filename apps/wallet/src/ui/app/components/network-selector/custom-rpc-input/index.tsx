// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useAppDispatch, useAppSelector } from '_hooks';
import { changeActiveNetwork } from '_redux/slices/app';
import { ampli } from '_src/shared/analytics/ampli';
import { isValidUrl } from '_src/shared/utils';
import { Checkmark, Globe, Link, Send, TriangleDown } from '@iota/apps-ui-icons';
import {
    Button,
    ButtonHtmlType,
    ButtonSize,
    ButtonType,
    Divider,
    Input,
    InputType,
} from '@iota/apps-ui-kit';
import { type NetworkEnvType, toast } from '@iota/core';
import { Network } from '@iota/iota-sdk/client';
import { AnimatePresence, motion } from 'framer-motion';
import { Form, Formik, useField, useFormikContext } from 'formik';
import { useState } from 'react';
import * as Yup from 'yup';

const MIN_CHAR = 5;

const validation = Yup.object({
    rpcInput: Yup.string()
        .required()
        .label('Custom RPC URL')
        .min(MIN_CHAR)
        .test('validate-url', 'Not a valid URL', (value) => isValidUrl(value || null)),
    explorerInput: Yup.string()
        .label('Custom Explorer URL')
        .test('validate-url', 'Not a valid URL', (value) => !value || isValidUrl(value || null)),
    faucetInput: Yup.string()
        .label('Custom Faucet URL')
        .test('validate-url', 'Not a valid URL', (value) => !value || isValidUrl(value || null)),
});

type FormValues = {
    rpcInput: string;
    explorerInput: string;
    faucetInput: string;
};

function SaveButton() {
    const { dirty, isValid, isSubmitting } = useFormikContext();
    const show = dirty && isValid && !isSubmitting;
    return (
        <motion.div
            animate={{ opacity: show ? 1 : 0, scale: show ? 1 : 0.85 }}
            transition={{ duration: 0.15 }}
            style={{ pointerEvents: show ? 'auto' : 'none' }}
        >
            <Button
                size={ButtonSize.Small}
                type={ButtonType.Ghost}
                htmlType={ButtonHtmlType.Submit}
                disabled={!show || isSubmitting}
                text="Save"
            />
        </motion.div>
    );
}

function ExpandableInputField({
    name,
    label,
    placeholder,
    icon,
}: {
    name: string;
    label: string;
    placeholder: string;
    icon: React.ReactNode;
}) {
    const [field, meta] = useField(name);
    const hasValue = !!field.value;
    const [isOpen, setIsOpen] = useState(hasValue);

    return (
        <div className="flex flex-col">
            <button
                type="button"
                onClick={() => setIsOpen((o) => !o)}
                className="flex w-full cursor-pointer items-center justify-between px-md py-xs"
            >
                <div className="flex flex-row items-center gap-xs">
                    <span className="text-iota-neutral-40 dark:text-iota-neutral-60">{icon}</span>
                    <span className="flex-1 text-left text-label-md text-iota-neutral-40 dark:text-iota-neutral-60">
                        {label}
                    </span>
                    {hasValue ? (
                        <Checkmark className="h-4 w-4 text-iota-tertiary-30 dark:text-iota-tertiary-70" />
                    ) : (
                        <span className="text-body-sm text-iota-neutral-60 dark:text-iota-neutral-50">
                            (Optional)
                        </span>
                    )}
                </div>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <TriangleDown className="h-4 w-4 text-iota-neutral-40 dark:text-iota-neutral-60" />
                </motion.span>
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        key="content"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="px-md pb-xs pt-xxs">
                            <Input
                                type={InputType.Text}
                                placeholder={placeholder}
                                errorMessage={meta?.error}
                                {...field}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function RpcInputField() {
    const [field, meta] = useField('rpcInput');
    return (
        <Input
            type={InputType.Text}
            placeholder="http://localhost:9000/"
            errorMessage={meta?.error}
            {...field}
        />
    );
}

export function CustomRPCInput() {
    const customRpc = useAppSelector(({ app }) => app.customRpc || '');
    const customExplorer = useAppSelector(({ app }) => app.customExplorer || '');
    const customFaucet = useAppSelector(({ app }) => app.customFaucet || '');

    const dispatch = useAppDispatch();

    const changeNetwork = async ({ rpcInput, explorerInput, faucetInput }: FormValues) => {
        try {
            const customNetwork = {
                network: Network.Custom,
                customRpcUrl: rpcInput,
                customExplorerUrl: explorerInput || null,
                customFaucetUrl: faucetInput || null,
            } satisfies NetworkEnvType;
            await dispatch(
                changeActiveNetwork({
                    network: customNetwork,
                    store: true,
                }),
            ).unwrap();
            ampli.switchedNetwork({ toNetwork: rpcInput });
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    return (
        <Formik
            initialValues={{
                rpcInput: customRpc,
                explorerInput: customExplorer,
                faucetInput: customFaucet,
            }}
            validationSchema={validation}
            onSubmit={changeNetwork}
        >
            <Form>
                <div className="flex flex-col px-md pb-xs pt-xs">
                    <div className="flex items-center gap-x-xs pb-xs">
                        <span className="text-iota-neutral-40 dark:text-iota-neutral-60">
                            <Link className="h-4 w-4" />
                        </span>
                        <span className="flex-1 text-label-md text-iota-neutral-40 dark:text-iota-neutral-60">
                            RPC URL
                        </span>
                        <SaveButton />
                    </div>
                    <RpcInputField />
                </div>
                <Divider />
                <ExpandableInputField
                    name="explorerInput"
                    label="Explorer URL"
                    placeholder="http://localhost:3000/"
                    icon={<Globe className="h-4 w-4" />}
                />
                <Divider />
                <ExpandableInputField
                    name="faucetInput"
                    label="Faucet URL"
                    placeholder="http://localhost:9123/gas"
                    icon={<Send className="h-4 w-4" />}
                />
            </Form>
        </Formik>
    );
}
