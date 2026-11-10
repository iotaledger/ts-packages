// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type ComponentProps } from 'react';
import {
    FormProvider,
    type FieldValues,
    type SubmitHandler,
    type UseFormReturn,
} from 'react-hook-form';

type FormProps<TInput extends FieldValues, TOutput extends FieldValues = TInput> = Omit<
    ComponentProps<'form'>,
    'onSubmit'
> & {
    form: UseFormReturn<TInput, unknown, TOutput>;
    onSubmit: SubmitHandler<TOutput>;
};

export function Form<TInput extends FieldValues, TOutput extends FieldValues = TInput>({
    form,
    onSubmit,
    children,
    ...props
}: FormProps<TInput, TOutput>) {
    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} {...props}>
                {children}
            </form>
        </FormProvider>
    );
}
