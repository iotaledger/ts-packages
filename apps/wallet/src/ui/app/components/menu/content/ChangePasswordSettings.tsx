// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useZodForm, toast } from '@iota/core';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button, ButtonHtmlType, ButtonType, Input, InputType } from '@iota/apps-ui-kit';
import { Overlay } from '_components';
import { Form } from '_src/ui/app/shared/forms/Form';
import { CheckboxField } from '_src/ui/app/shared/forms/CheckboxField';
import { useBackgroundClient } from '_src/ui/app/hooks/useBackgroundClient';
import zxcvbn from 'zxcvbn';

const formSchema = z
    .object({
        currentPassword: z.string().nonempty('Required'),
        newPassword: z
            .string()
            .nonempty('Required')
            .superRefine((val, ctx) => {
                const {
                    score,
                    feedback: { warning, suggestions },
                } = zxcvbn(val);
                if (score <= 2) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `${warning ? `${warning}.` : 'Password is not strong enough.'}${suggestions?.length ? ` ${suggestions.join(' ')}` : ''}`,
                    });
                }
            }),
        confirmPassword: z.string().nonempty('Required'),
        confirmed: z.literal<boolean>(true, {
            errorMap: () => ({ message: 'You must confirm you understand this change' }),
        }),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        path: ['confirmPassword'],
        message: "Passwords don't match",
    })
    .refine((data) => data.newPassword !== data.currentPassword, {
        path: ['newPassword'],
        message: 'New password must be different from current password',
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
            confirmed: false as unknown as true,
        },
    });

    const {
        register,
        formState: { isSubmitting, isValid, errors },
    } = form;

    async function handleSubmit(values: FormValues) {
        try {
            await backgroundClient.changePassword({
                currentPassword: values.currentPassword.trim(),
                newPassword: values.newPassword.trim(),
            });
            toast.success('Password updated successfully');
            navigate(-1);
        } catch (e) {
            toast.error((e as Error)?.message || 'Failed to update password');
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
                    label="Current Password"
                    placeholder="Enter current password"
                    errorMessage={errors.currentPassword?.message}
                    {...register('currentPassword')}
                    data-amp-mask
                />
                <Input
                    type={InputType.Password}
                    isVisibilityToggleEnabled
                    label="New Password"
                    placeholder="Enter new password"
                    errorMessage={errors.newPassword?.message}
                    {...register('newPassword')}
                    data-amp-mask
                />
                <Input
                    type={InputType.Password}
                    isVisibilityToggleEnabled
                    label="Confirm New Password"
                    placeholder="Confirm new password"
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
                    disabled={!isValid || isSubmitting}
                    fullWidth
                />
            </Form>
        </Overlay>
    );
}
