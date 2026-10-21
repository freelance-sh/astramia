"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import type { NatalChart } from "@/core/reading/domain/types";
import { NatalWheel, WHEEL_DRAW_STEPS } from "../../components/natal-wheel";

const WHEEL_SIZE = "w-[min(70vw,360px)] lg:w-[520px]";

/** Their chart drawing itself, body by body, then turning very slowly. */
export function SkyScene({
    chart,
    litAspects = false,
    caption,
}: {
    chart: NatalChart;
    litAspects?: boolean;
    caption?: string;
}) {
    const reducedMotion = useReducedMotion();
    const [drawn, setDrawn] = useState(reducedMotion ? WHEEL_DRAW_STEPS : 0);

    useEffect(() => {
        if (reducedMotion) {
            setDrawn(WHEEL_DRAW_STEPS);
            return;
        }
        const timer = window.setInterval(
            () =>
                setDrawn((d) => {
                    if (d >= WHEEL_DRAW_STEPS) window.clearInterval(timer);
                    return Math.min(d + 1, WHEEL_DRAW_STEPS);
                }),
            550,
        );
        return () => window.clearInterval(timer);
    }, [reducedMotion]);

    return (
        <div className="flex h-full w-full flex-col items-center justify-start gap-4 pt-4 lg:justify-center lg:gap-5 lg:pt-0">
            <div className={`relative aspect-square ${WHEEL_SIZE}`}>
                <motion.div
                    aria-hidden
                    className="absolute inset-[14%] rounded-full bg-astral-violet/25 blur-3xl max-lg:blur-xl"
                    animate={
                        reducedMotion
                            ? undefined
                            : {
                                  opacity: [0.4, 0.85, 0.4],
                                  scale: [0.95, 1.05, 0.95],
                              }
                    }
                    transition={{
                        duration: 7,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                    }}
                />
                <NatalWheel
                    chart={chart}
                    drawn={drawn}
                    spin
                    litAspects={litAspects}
                    className="relative"
                />
            </div>
            {caption && (
                <p className="font-mono text-[11px] text-astral-gold uppercase tracking-[0.22em]">
                    {caption}
                </p>
            )}
        </div>
    );
}

const STAR =
    "M12 1.5 14.2 9.8 22.5 12 14.2 14.2 12 22.5 9.8 14.2 1.5 12 9.8 9.8Z";

/** One small light: something to do this week. */
export function StarScene() {
    const reducedMotion = useReducedMotion();
    return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="relative size-[min(46vw,220px)] lg:size-[260px]">
                <motion.div
                    aria-hidden
                    className="absolute inset-[-40%] rounded-full bg-astral-gold/20 blur-3xl max-lg:blur-xl"
                    animate={
                        reducedMotion ? undefined : { opacity: [0.5, 1, 0.5] }
                    }
                    transition={{
                        duration: 4,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                    }}
                />
                {!reducedMotion && (
                    <motion.div
                        aria-hidden
                        className="absolute inset-0 rounded-full border border-astral-gold/60"
                        initial={{ scale: 0.2, opacity: 1 }}
                        animate={{ scale: 2.2, opacity: 0 }}
                        transition={{
                            duration: 2.2,
                            delay: 0.4,
                            ease: "easeOut",
                        }}
                    />
                )}
                <motion.svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="relative h-full w-full drop-shadow-[0_0_24px_var(--astral-gold)]"
                    initial={{ scale: reducedMotion ? 1 : 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                        duration: reducedMotion ? 0 : 1.4,
                        ease: [0.2, 0.8, 0.2, 1],
                    }}
                >
                    <path d={STAR} fill="var(--astral-gold)" />
                </motion.svg>
            </div>
        </div>
    );
}
