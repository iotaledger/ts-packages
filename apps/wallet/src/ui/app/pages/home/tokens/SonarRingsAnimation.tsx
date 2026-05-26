// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { motion } from 'framer-motion';

const RING_CONFIG = [
    { delay: 0, duration: 2.8 },
    { delay: 0.93, duration: 2.8 },
    { delay: 1.86, duration: 2.8 },
];

export function SonarRingsAnimation() {
    return (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {RING_CONFIG.map((ring, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full border-2 border-iota-primary-30"
                    style={{ width: 120, height: 120 }}
                    animate={{ scale: [1, 3.6], opacity: [0, 0.35, 0] }}
                    transition={{
                        duration: ring.duration,
                        ease: 'easeOut',
                        repeat: Infinity,
                        delay: ring.delay,
                        times: [0, 0.08, 1],
                    }}
                />
            ))}
        </div>
    );
}
