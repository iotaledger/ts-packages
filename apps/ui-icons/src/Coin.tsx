// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { SVGProps } from 'react';
export default function SvgCoin(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            fill="none"
            viewBox="0 0 24 24"
            {...props}
        >
            <path
                fill="currentColor"
                fillRule="evenodd"
                d="M12 4c5.523 0 10 2.239 10 5v4.999c0 2.761-4.477 5-10 5s-10-2.239-10-5V9c0-2.761 4.477-5 10-5M7 16.232c1.122.385 2.485.655 4 .739v-2.998a17.6 17.6 0 0 1-4-.644zm10-2.903a17.6 17.6 0 0 1-4 .644v2.998c1.515-.084 2.878-.354 4-.739zM4 14c0 .17.143.667 1 1.264v-2.697A9 9 0 0 1 4 12zm16-2c-.304.202-.64.39-1 .567v2.697c.857-.597 1-1.093 1-1.264zM12 6c-2.518 0-4.7.514-6.177 1.253C4.226 8.05 4 8.785 4 9s.226.949 1.823 1.747C7.301 11.486 9.482 12 12 12s4.7-.514 6.177-1.253C19.774 9.95 20 9.215 20 9s-.226-.949-1.823-1.747C16.699 6.514 14.518 6 12 6"
                clipRule="evenodd"
            />
        </svg>
    );
}
