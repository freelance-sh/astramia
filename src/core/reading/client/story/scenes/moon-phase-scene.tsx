"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { MoonDisc } from "@/core/landing/client/effects";
import {
    type MoonPhase,
    type MoonPhaseName,
    PHASE_NAMES,
} from "@/core/landing/domain/ephemeris";
import { cn } from "@/frontend/lib/utils";
import { Globe } from "../globe";

/** From the new Moon round to theirs: long enough to see, short enough to wait. */
const SETTLE_SECONDS = 4.2;

export function phaseAt(fraction: number): MoonPhase {
    const f = ((fraction % 1) + 1) % 1;
    return {
        fraction: f,
        illumination: (1 - Math.cos(f * 2 * Math.PI)) / 2,
        name: PHASE_NAMES[Math.round(f * 8) % 8],
        waxing: f < 0.5,
    };
}

export function phaseFraction(name: MoonPhaseName): number {
    return Math.max(PHASE_NAMES.indexOf(name), 0) / 8;
}

/**
 * A lunar month passes in a few seconds and comes to rest on the phase they
 * were born under. The row of eight phases says "this is a cycle" to anyone,
 * and marks where theirs stopped.
 */
export function MoonPhaseScene({
    phase,
    born,
}: {
    phase: MoonPhaseName;
    born: string;
}) {
    const reducedMotion = useReducedMotion();
    const target = phaseFraction(phase);
    const [fraction, setFraction] = useState(reducedMotion ? target : 0);
    const settled = reducedMotion || fraction >= 1 + target - 0.001;

    useEffect(() => {
        if (reducedMotion) {
            setFraction(1 + target);
            return;
        }
        const controls = animate(0, 1 + target, {
            duration: SETTLE_SECONDS,
            // Slows down as it arrives, like settling on a page.
            ease: [0.35, 0, 0.15, 1],
            onUpdate: setFraction,
        });
        return () => controls.stop();
    }, [reducedMotion, target]);

    const current = phaseAt(fraction);
    const lit = PHASE_NAMES.indexOf(current.name);

    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-8">
            <div className="relative">
                <motion.div
                    aria-hidden
                    className="absolute inset-[-30%] rounded-full bg-astral-gold-soft/15 blur-3xl max-lg:blur-xl"
                    animate={{ opacity: settled ? 1 : 0.35 }}
                    transition={{ duration: 1.2 }}
                />
                <Globe
                    body="Luna"
                    phase={current.fraction}
                    className="relative size-[min(52vw,240px)] lg:size-[300px]"
                    fallback={
                        <MoonDisc
                            phase={current}
                            className="relative size-[min(52vw,240px)] lg:size-[300px]"
                        />
                    }
                />
            </div>
            <ol aria-hidden className="flex items-center gap-2.5 sm:gap-3">
                {PHASE_NAMES.map((name, i) => (
                    <li
                        key={name}
                        className={cn(
                            "rounded-full p-0.5 ring-1 ring-transparent transition-[box-shadow,opacity] duration-300",
                            i === lit ? "opacity-100" : "opacity-45",
                            i === lit && settled && "ring-astral-gold",
                        )}
                    >
                        <MoonDisc
                            phase={phaseAt(i / 8)}
                            className="size-5 sm:size-6"
                        />
                    </li>
                ))}
            </ol>
            <p
                aria-hidden
                className={cn(
                    "font-mono text-[11px] uppercase tracking-[0.2em] transition-colors duration-700 max-lg:hidden",
                    settled ? "text-astral-gold" : "text-muted-foreground",
                )}
            >
                {settled ? `${born} · ${current.name}` : current.name}
            </p>
        </div>
    );
}
