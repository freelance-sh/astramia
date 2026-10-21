"use client";

import {
    motion,
    useReducedMotion,
    useScroll,
    useTransform,
} from "motion/react";
import type { PropsWithChildren } from "react";
import { useIsMobile } from "@/frontend/hooks/use-mobile";

interface ParallaxLayerProps extends PropsWithChildren {
    className?: string;
    /** Fraction of the scroll distance the layer moves against. 0.2 ≈ far. */
    speed?: number;
}

/** Scroll-linked layer that drifts slower than the page. */
export function ParallaxLayer({
    children,
    className,
    speed = 0.2,
}: ParallaxLayerProps) {
    const reducedMotion = useReducedMotion();
    const isMobile = useIsMobile();
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, (v) =>
        reducedMotion || isMobile ? 0 : v * -speed,
    );

    if (isMobile) return <div className={className}>{children}</div>;

    return (
        <motion.div className={className} style={{ y }}>
            {children}
        </motion.div>
    );
}
