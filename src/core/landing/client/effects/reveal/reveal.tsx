"use client";

import { motion, useReducedMotion } from "motion/react";
import type { PropsWithChildren } from "react";

interface RevealProps extends PropsWithChildren {
    className?: string;
    delay?: number;
}

/** Fades + lifts children into view once, on scroll. */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
    const reducedMotion = useReducedMotion();

    return (
        <motion.div
            className={className}
            initial={reducedMotion ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
        >
            {children}
        </motion.div>
    );
}
