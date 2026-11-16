// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { FieldValues, UseFormProps } from 'react-hook-form';
import type { ZodType } from 'zod';

interface UseZodFormProps<
    Input extends FieldValues,
    Output extends FieldValues,
> extends UseFormProps<Input, unknown, Output> {
    schema: ZodType<Output, Input>;
}

export const useZodForm = <Input extends FieldValues, Output extends FieldValues>({
    schema,
    ...formConfig
}: UseZodFormProps<Input, Output>) =>
    useForm<Input, unknown, Output>({
        ...formConfig,
        resolver: zodResolver(schema),
    });
