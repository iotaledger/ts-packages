// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from 'react';
import { useZodForm, toast } from '@iota/core';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
    Button,
    ButtonHtmlType,
    ButtonType,
    Input,
    InputType,
    LoadingIndicator,
} from '@iota/apps-ui-kit';
import { Overlay } from '_components';
import { AccountTooManyAttemptsError, getTooManyAttemptsMessage } from '_src/shared/accounts';
import { Form } from '_src/ui/app/shared/forms/Form';
import { CheckboxField } from '_src/ui/app/shared/forms/CheckboxField';
import { validatePasswordStrength } from '_src/ui/app/shared/forms/passwordValidation';
import { useBackgroundClient } from '_src/ui/app/hooks/useBackgroundClient';

const formSchema = z
    .object({
        currentPassword: z.string().nonempty('Required'),
        newPassword: z
            .string()
            .nonempty('Required')
            .min(8, 'Must be at least 8 characters')
            .superRefine(validatePasswordStrength),
        confirmPassword: z.string().nonempty('Required'),
        confirmed: z.boolean(),
    })
    .superRefine((data, ctx) => {
        if (data.confirmPassword && data.newPassword !== data.confirmPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['confirmPassword'],
                message: "Passwords don't match",
            });
        }
        if (data.currentPassword && data.newPassword === data.currentPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['newPassword'],
                message: 'New password must be different from current password',
            });
        }
        if (!data.confirmed) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['confirmed'],
                message: 'You must confirm you understand this change',
            });
        }
    });

type FormValues = z.infer<typeof formSchema>;

export function ChangePasswordSettings() {
    const navigate = useNavigate();
    const backgroundClient = useBackgroundClient();

    const form = useZodForm({
        mode: 'all',
        schema: formSchema,
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
            confirmed: false,
        },
    });

    const {
        register,
        watch,
        trigger,
        getValues,
        formState: { isSubmitting, isValid, errors },
    } = form;

    useEffect(() => {
        const { unsubscribe } = watch((_, { name, type }) => {
            if (type !== 'change') return;
            if (name !== 'newPassword' && getValues('newPassword')) {
                trigger('newPassword');
            }
            if (name !== 'confirmPassword' && getValues('confirmPassword')) {
                trigger('confirmPassword');
            }
        });
        return unsubscribe;
    }, [watch, trigger, getValues]);

    async function getSubmitErrorMessage(error: unknown) {
        if (error instanceof Error && AccountTooManyAttemptsError.is(error)) {
            const { remainingTime } = await backgroundClient.getLockedState({});
            return getTooManyAttemptsMessage(remainingTime);
        }
        return (error as Error)?.message || 'Failed to update password';
    }

    async function handleSubmit(values: FormValues) {
        try {
            await backgroundClient.changePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            });
            toast.success('Password updated successfully');
            navigate(-1);
        } catch (e) {
            toast.error(await getSubmitErrorMessage(e));
        }
    }

    return (
        <Overlay
            showModal
            title="Change Password"
            closeOverlay={() => navigate('/tokens')}
            showBackButton
        >
            <Form className="flex h-full flex-col gap-y-md" form={form} onSubmit={handleSubmit}>
                <Input
                    type={InputType.Password}
                    isVisibilityToggleEnabled
                    label="Current password"
                    placeholder="********"
                    errorMessage={errors.currentPassword?.message}
                    {...register('currentPassword')}
                    data-amp-mask
                />
                <Input
                    type={InputType.Password}
                    isVisibilityToggleEnabled
                    label="New password"
                    placeholder="********"
                    errorMessage={errors.newPassword?.message}
                    {...register('newPassword')}
                    data-amp-mask
                />
                <Input
                    type={InputType.Password}
                    isVisibilityToggleEnabled
                    label="Confirm new password"
                    placeholder="********"
                    errorMessage={errors.confirmPassword?.message}
                    {...register('confirmPassword')}
                    data-amp-mask
                />
                <div className="flex-1" />
                <CheckboxField
                    name="confirmed"
                    label="This password secures all accounts. If I forget it, IOTA cannot restore access"
                />
                <Button
                    type={ButtonType.Primary}
                    htmlType={ButtonHtmlType.Submit}
                    text="Update Password"
                    icon={isSubmitting ? <LoadingIndicator /> : null}
                    disabled={!isValid || isSubmitting}
                    fullWidth
                />
            </Form>
        </Overlay>
    );
}
