// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Badge, BadgeType, DatePicker, DatePickerFormat, RadioButton } from '@iota/apps-ui-kit';
import { useEffect, useMemo, useState } from 'react';

import { useNamesConfig } from '@/hooks/useNamesConfig';
import { formatExpirationDate } from '@/lib/utils/format/formatExpirationDate';

interface ExpirationDateProps {
    parentExpirationDate: Date | null;
    currentExpirationDate: Date | null;
    maxDate: Date | null;
    minDate?: Date | null;
    onChange: (date: Date | null) => void;
    onExpirationTypeChange?: (isParentExpiration: boolean) => void;
}

export function ExpirationDate({
    parentExpirationDate,
    currentExpirationDate,
    maxDate,
    minDate,
    onChange,
    onExpirationTypeChange,
}: ExpirationDateProps) {
    const { data: config, isLoading: isLoadingConfig } = useNamesConfig();

    const [isParentExpiration, setIsParentExpiration] = useState<boolean>(true);
    const [customExpirationDate, setCustomExpirationDate] = useState<Date | null>(null);

    const minimumDate = useMemo(() => {
        if (!config?.subnamesConfig) return minDate ?? new Date();
        const minimumDuration = Number(config.subnamesConfig.minimum_duration);
        const now = new Date();
        return minDate && minDate > now
            ? new Date(minDate.getTime() + minimumDuration)
            : new Date(now.getTime() + 2 * minimumDuration);
    }, [minDate, config]);

    const parentExpirationTime = parentExpirationDate?.getTime() ?? null;
    useEffect(() => {
        if (isParentExpiration && parentExpirationDate) {
            onChange(parentExpirationDate);
        }
    }, [parentExpirationTime, isParentExpiration]);

    function handleDateChange(date: Date) {
        const now = new Date();
        const isMaxDay =
            maxDate &&
            date.getFullYear() === maxDate.getFullYear() &&
            date.getMonth() === maxDate.getMonth() &&
            date.getDate() === maxDate.getDate();

        const selectedDate = isMaxDay
            ? new Date(maxDate)
            : new Date(
                  date.getFullYear(),
                  date.getMonth(),
                  date.getDate(),
                  now.getHours(),
                  now.getMinutes(),
                  now.getSeconds(),
                  now.getMilliseconds(),
              );

        setCustomExpirationDate(selectedDate);
        onChange(selectedDate);
    }

    return (
        <>
            <div className="flex flex-col gap-y-md w-full">
                <span className="text-label-lg text-names-neutral-92">Expiration Date</span>
                <div className="flex items-center justify-between gap-x-sm">
                    <RadioButton
                        name="parent_expiration"
                        isChecked={isParentExpiration}
                        onChange={() => {
                            setIsParentExpiration(true);
                            onChange(parentExpirationDate);
                            onExpirationTypeChange?.(true);
                        }}
                        label="Same as parent"
                    />
                    <Badge
                        type={BadgeType.Neutral}
                        label={
                            parentExpirationDate ? formatExpirationDate(parentExpirationDate) : ''
                        }
                    />
                </div>
                <RadioButton
                    name="custom_expiration"
                    isChecked={!isParentExpiration}
                    onChange={() => {
                        setIsParentExpiration(false);
                        onChange(customExpirationDate);
                        onExpirationTypeChange?.(false);
                    }}
                    isDisabled={
                        parentExpirationDate?.toDateString() ===
                        currentExpirationDate?.toDateString()
                    }
                    label="Custom"
                />
            </div>
            <div className="flex flex-col gap-y-xs w-full">
                <DatePicker
                    value={customExpirationDate ?? undefined}
                    onChange={handleDateChange}
                    minDate={minimumDate}
                    maxDate={maxDate ?? undefined}
                    dateFormat={DatePickerFormat.MonthDayYear}
                    disabled={isParentExpiration || isLoadingConfig}
                />
            </div>
        </>
    );
}
