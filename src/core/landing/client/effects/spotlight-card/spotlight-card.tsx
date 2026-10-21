"use client";

import { type ComponentProps, type PointerEvent, useCallback } from "react";
import { Card } from "@/frontend/components/ui/card";
import { cn } from "@/frontend/lib/utils";
import styles from "./spotlight-card.module.css";

/**
 * shadcn `Card` with a pointer-tracking glow and luminous border.
 * Writes the pointer position to CSS vars; no React re-renders.
 */
export function SpotlightCard({
    className,
    onPointerMove,
    ...props
}: ComponentProps<typeof Card>) {
    const handlePointerMove = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            if (event.pointerType !== "mouse") return;
            const rect = event.currentTarget.getBoundingClientRect();
            event.currentTarget.style.setProperty(
                "--spot-x",
                `${event.clientX - rect.left}px`,
            );
            event.currentTarget.style.setProperty(
                "--spot-y",
                `${event.clientY - rect.top}px`,
            );
            onPointerMove?.(event);
        },
        [onPointerMove],
    );

    return (
        <Card
            className={cn(styles.card, className)}
            onPointerMove={handlePointerMove}
            {...props}
        />
    );
}
