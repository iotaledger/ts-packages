// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { curveCatmullRom as curve } from '@visx/curve';
import { localPoint } from '@visx/event';
import { scaleLinear } from '@visx/scale';
import { AreaClosed, LinePath } from '@visx/shape';
import { useTooltip, useTooltipInPortal } from '@visx/tooltip';
import { bisector, extent } from 'd3-array';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { throttle } from 'throttle-debounce';
import { GraphTooltipContainer } from './GraphTooltipContent';

let idCounter = 0;
function uid(prefix: string) {
    return `${prefix}_${idCounter++}`;
}

const bisectX = bisector((x: number) => x).center;

type SparklineProps<D> = {
    data: D[];
    width: number;
    height: number;
    getX: (d: D) => number;
    getY: (d: D) => number;
    /** Explicit [min, max] for the Y axis. Defaults to data extent with no extra padding. */
    yDomain?: [number, number];
    tooltipContent?: (props: { data: D }) => ReactNode;
};

export function Sparkline<D>({
    data,
    width,
    height,
    getX,
    getY,
    yDomain,
    tooltipContent,
}: SparklineProps<D>) {
    const [fillId] = useState(() => uid('spark_fill'));
    const [lineId] = useState(() => uid('spark_line'));

    const { TooltipInPortal, containerRef } = useTooltipInPortal({ scroll: true });
    const { tooltipOpen, hideTooltip, showTooltip, tooltipData, tooltipLeft, tooltipTop } =
        useTooltip<D>({ tooltipLeft: 0, tooltipTop: 0 });

    const xScale = useMemo(
        () =>
            scaleLinear<number>({
                domain: extent(data, getX) as [number, number],
                range: [0, width],
            }),
        [data, getX, width],
    );

    const yScale = useMemo(() => {
        const domain = yDomain ?? (extent(data, getY) as [number, number]);
        return scaleLinear<number>({ domain, range: [height, 0] });
    }, [data, getY, height, yDomain]);

    const handleTooltip = useCallback(
        (x: number) => {
            if (!tooltipContent) return;
            const nearest = data[bisectX(data.map(getX), xScale.invert(x), 0)];
            showTooltip({
                tooltipData: nearest,
                tooltipLeft: xScale(getX(nearest)),
                tooltipTop: yScale(getY(nearest)),
            });
        },
        [xScale, yScale, showTooltip, data, getX, getY, tooltipContent],
    );

    const throttledRef = useRef<ReturnType<typeof throttle>>();
    const [throttled, setThrottled] = useState<ReturnType<typeof throttle>>();
    useEffect(() => {
        throttledRef.current = throttle(100, handleTooltip);
        setThrottled(() => throttledRef.current);
        return () => throttledRef.current?.cancel?.();
    }, [handleTooltip]);

    const tooltipContentProps = useMemo(
        () => (tooltipData ? { data: tooltipData } : null),
        [tooltipData],
    );

    if (!data.length || width === 0 || height === 0) return null;

    const tooltipTopAdj = tooltipTop ? Math.max(tooltipTop - 20, 0) : undefined;

    return (
        <div className="relative" style={{ width, height }} ref={containerRef}>
            {tooltipOpen && tooltipContentProps && tooltipContent ? (
                <TooltipInPortal
                    key={Math.random()}
                    offsetLeft={0}
                    offsetTop={0}
                    left={tooltipLeft}
                    top={tooltipTopAdj}
                    className="pointer-events-none absolute z-10 h-0 w-max overflow-visible"
                    unstyled
                    detectBounds
                >
                    <GraphTooltipContainer>
                        {tooltipContent(tooltipContentProps)}
                    </GraphTooltipContainer>
                </TooltipInPortal>
            ) : null}

            <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
                <defs>
                    <linearGradient id={fillId} gradientTransform="rotate(90)">
                        <stop
                            stopColor="currentColor"
                            className="text-shader-primary-light-16 dark:text-shader-primary-dark-16"
                        />
                        <stop
                            offset="1"
                            stopColor="currentColor"
                            className="text-shader-primary-light-0 dark:text-shader-primary-dark-0"
                            stopOpacity={0}
                        />
                    </linearGradient>
                    <linearGradient id={lineId}>
                        <stop
                            stopColor="currentColor"
                            className="text-iota-primary-30 dark:text-iota-primary-80"
                        />
                    </linearGradient>
                </defs>

                <AreaClosed<D>
                    curve={curve}
                    data={data}
                    yScale={yScale}
                    x={(d) => xScale(getX(d))}
                    y={(d) => yScale(getY(d))}
                    fill={`url(#${fillId})`}
                    stroke="transparent"
                />
                <LinePath<D>
                    curve={curve}
                    data={data}
                    x={(d) => xScale(getX(d))}
                    y={(d) => yScale(getY(d))}
                    stroke={`url(#${lineId})`}
                    strokeWidth={1.5}
                />

                {tooltipContent && (
                    <rect
                        x={0}
                        y={0}
                        width={width}
                        height={height}
                        fill="transparent"
                        stroke="none"
                        onMouseEnter={(e) => throttled?.(localPoint(e)?.x ?? 0)}
                        onMouseMove={(e) => throttled?.(localPoint(e)?.x ?? 0)}
                        onMouseLeave={() => {
                            throttled?.cancel({ upcomingOnly: true });
                            hideTooltip();
                        }}
                    />
                )}
            </svg>
        </div>
    );
}
