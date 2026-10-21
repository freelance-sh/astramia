"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { ZODIAC_SIGNS } from "@/core/landing/domain/zodiac";
import { CONSTELLATIONS } from "../story/constellations";

/** One constellation: it forms, holds a moment, and gives way to the next. */
const CYCLE_MS = 5400;
/** Seconds for all its stars to light, and for its lines to join them. */
const STARS_IN = 1.6;
const LINES_IN = 2.2;

/**
 * While the paid part is written: the constellations of the signs it's
 * about form one after another, stars first, then the lines between them.
 */
export function FormingSky({
    skies,
}: {
    /** "Venus", "Tu Luna", "Ascendente": what's in that sign. */
    skies: readonly { body: string; sign: string }[];
}) {
    const reducedMotion = useReducedMotion();
    const [turn, setTurn] = useState(0);
    useEffect(() => {
        if (reducedMotion) return;
        const timer = window.setInterval(() => setTurn((t) => t + 1), CYCLE_MS);
        return () => window.clearInterval(timer);
    }, [reducedMotion]);

    const sky = skies[turn % skies.length];
    const figure = CONSTELLATIONS[sky.sign];
    const glyph = ZODIAC_SIGNS.find((s) => s.name === sky.sign)?.glyph;
    const quick = (seconds: number) => (reducedMotion ? 0 : seconds);
    const starStep = figure ? STARS_IN / figure.stars.length : 0;
    const lineStep = figure ? LINES_IN / Math.max(figure.lines.length, 1) : 0;

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative aspect-square w-[min(68vw,300px)]">
                <div
                    aria-hidden
                    className="absolute inset-[14%] rounded-full bg-[radial-gradient(circle,oklch(0.85_0.15_75/16%),transparent_70%)] blur-2xl max-lg:blur-xl"
                />
                <AnimatePresence mode="wait">
                    {figure && (
                        <motion.svg
                            key={turn}
                            viewBox="0 0 100 100"
                            aria-hidden="true"
                            className="absolute inset-0 size-full overflow-visible"
                            // A slow drift toward the viewer while it forms.
                            initial={{ scale: reducedMotion ? 1 : 0.94 }}
                            animate={{
                                scale: 1,
                                transition: {
                                    duration: quick(CYCLE_MS / 1000),
                                    ease: "linear",
                                },
                            }}
                            exit={{
                                opacity: 0,
                                scale: 1.03,
                                transition: { duration: 0.6 },
                            }}
                        >
                            {figure.lines.map(([from, to], i) => {
                                const a = figure.stars[from];
                                const b = figure.stars[to];
                                return (
                                    <motion.line
                                        key={`${from}-${to}`}
                                        x1={a[0]}
                                        y1={a[1]}
                                        x2={b[0]}
                                        y2={b[1]}
                                        stroke="var(--astral-gold)"
                                        strokeOpacity={0.5}
                                        strokeWidth={0.4}
                                        strokeLinecap="round"
                                        initial={{
                                            pathLength: reducedMotion ? 1 : 0,
                                        }}
                                        animate={{ pathLength: 1 }}
                                        transition={{
                                            duration: quick(0.7),
                                            delay: quick(0.5 + i * lineStep),
                                            ease: "easeInOut",
                                        }}
                                    />
                                );
                            })}
                            {figure.stars.map(([x, y, size], i) => (
                                <motion.circle
                                    key={`${x}-${y}`}
                                    cx={x}
                                    cy={y}
                                    r={0.55 + size * 0.42}
                                    fill="var(--astral-gold-soft)"
                                    style={{
                                        filter: "drop-shadow(0 0 1.6px var(--astral-gold))",
                                    }}
                                    initial={{ opacity: reducedMotion ? 1 : 0 }}
                                    // Lights up bright, then settles to a glow.
                                    animate={{
                                        opacity: reducedMotion
                                            ? 1
                                            : [0, 1, 0.7, 1],
                                    }}
                                    transition={{
                                        duration: quick(1.4),
                                        delay: quick(i * starStep),
                                        times: [0, 0.25, 0.6, 1],
                                    }}
                                />
                            ))}
                        </motion.svg>
                    )}
                </AnimatePresence>
            </div>
            <AnimatePresence mode="wait">
                <motion.p
                    key={turn}
                    aria-hidden
                    className="font-mono text-[11px] text-astral-gold uppercase tracking-[0.22em]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: quick(0.6) }}
                >
                    {sky.body} · {glyph} {sky.sign}
                </motion.p>
            </AnimatePresence>
        </div>
    );
}
