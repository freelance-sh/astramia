"use client";

import { motion, useReducedMotion } from "motion/react";
import { MoonDisc } from "@/core/landing/client/effects";
import type { MoonPhaseName } from "@/core/landing/domain/ephemeris";
import { ZODIAC_SIGNS } from "@/core/landing/domain/zodiac";
import type { StoryBody } from "@/core/reading/domain/story";
import { CONSTELLATIONS } from "../constellations";
import { Globe } from "../globe";
import { phaseAt, phaseFraction } from "./moon-phase-scene";

/** Each body in colors people already picture for it. */
const ORBS: Record<
    Exclude<StoryBody, "Luna">,
    { surface: string; glow: string }
> = {
    Sol: {
        surface:
            "radial-gradient(circle at 38% 34%, #fffbe8 0%, #ffd66b 28%, #f2a531 62%, #c8641a 100%)",
        glow: "oklch(0.82 0.16 75 / 55%)",
    },
    Venus: {
        surface:
            "radial-gradient(circle at 36% 32%, #fffdf6 0%, #f3dfbd 35%, #cfa978 72%, #8c6a45 100%)",
        glow: "oklch(0.9 0.07 75 / 40%)",
    },
    Marte: {
        surface:
            "radial-gradient(circle at 36% 32%, #ffd2b4 0%, #e07a52 32%, #b4452b 66%, #5a1d12 100%)",
        glow: "oklch(0.62 0.17 35 / 45%)",
    },
};

const MOON_GLOW = "oklch(0.92 0.03 270 / 30%)";

/** The drawn sphere sits inside its canvas; the Sun leaves room for its corona. */
const GLOBE_SIZE: Record<StoryBody, string> = {
    Sol: "size-[min(80vw,330px)] lg:size-[440px]",
    Luna: "size-[min(36vw,160px)] lg:size-[200px]",
    Venus: "size-[min(40vw,180px)] lg:size-[230px]",
    Marte: "size-[min(40vw,180px)] lg:size-[230px]",
};

/** Without WebGL: the plain sphere it used to be. */
function FlatOrb({
    body,
    moonPhase,
}: {
    body: StoryBody;
    moonPhase: MoonPhaseName;
}) {
    const size = "size-[min(30vw,140px)] lg:size-[170px]";
    if (body === "Luna")
        return (
            <MoonDisc
                phase={phaseAt(phaseFraction(moonPhase))}
                className={size}
            />
        );
    return (
        <div
            className={`rounded-full ${size}`}
            style={{
                background: ORBS[body].surface,
                boxShadow: "inset -14px -18px 40px rgb(0 0 0 / 45%)",
            }}
        />
    );
}

/** A globe that takes over from the solar system's dot. */
export interface Ride {
    /** Its canvas, sized so the sphere is exactly the dot. */
    size: string;
    /** Lit from where the Sun was, like the dot. */
    light?: readonly [number, number, number];
    /** Not on screen yet: drawn once, kept still. */
    paused: boolean;
}

function Orb({
    body,
    moonPhase,
    ride,
}: {
    body: StoryBody;
    moonPhase: MoonPhaseName;
    ride?: Ride;
}) {
    return (
        <Globe
            body={body}
            phase={body === "Luna" ? phaseFraction(moonPhase) : undefined}
            light={ride?.light}
            paused={ride?.paused}
            className={ride ? undefined : GLOBE_SIZE[body]}
            style={ride ? { width: ride.size, height: ride.size } : undefined}
            fallback={<FlatOrb body={body} moonPhase={moonPhase} />}
        />
    );
}

/**
 * A body over its sign: the constellation draws itself, then the planet
 * floats in among its stars. Recognizable at a glance, no chart literacy
 * needed.
 */
export function PlanetScene({
    body,
    sign,
    signs,
    moonPhase,
    born,
    ride,
    landed = true,
}: {
    body: StoryBody;
    sign: string;
    signs?: readonly [string, string];
    moonPhase: MoonPhaseName;
    born: string;
    /** Mounted ahead to take over from the solar system's dot. */
    ride?: Ride;
    /** The camera is there: its stars draw themselves only then. */
    landed?: boolean;
}) {
    const reducedMotion = useReducedMotion();
    const figure = CONSTELLATIONS[sign];
    const zodiac = ZODIAC_SIGNS.find((s) => s.name === sign);
    const glow = body === "Luna" ? MOON_GLOW : ORBS[body].glow;
    const signLabel = signs ? `${signs[0]} o ${signs[1]}` : sign;
    const quick = (seconds: number) => (reducedMotion ? 0 : seconds);

    return (
        <div className="relative flex h-full w-full flex-col items-center justify-center">
            <motion.div
                aria-hidden
                className="absolute top-1/2 left-1/2 size-[80%] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl max-lg:blur-xl"
                style={{
                    background: `radial-gradient(circle, ${glow}, transparent 70%)`,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: landed ? 0.4 : 0 }}
                transition={{ duration: quick(1) }}
            />
            <div className="relative aspect-square w-[min(82vw,370px)] lg:w-[560px]">
                {figure && (
                    <svg
                        viewBox="0 0 100 100"
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full overflow-visible"
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
                                    strokeOpacity={0.4}
                                    strokeWidth={0.35}
                                    strokeLinecap="round"
                                    initial={{
                                        pathLength: reducedMotion ? 1 : 0,
                                    }}
                                    animate={{ pathLength: landed ? 1 : 0 }}
                                    transition={{
                                        duration: quick(0.7),
                                        delay: quick(0.3 + i * 0.18),
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
                                r={0.45 + size * 0.38}
                                fill="var(--astral-gold-soft)"
                                style={{
                                    filter: "drop-shadow(0 0 1.5px var(--astral-gold))",
                                }}
                                initial={{ opacity: reducedMotion ? 1 : 0 }}
                                animate={
                                    !landed
                                        ? { opacity: 0 }
                                        : reducedMotion
                                          ? { opacity: 1 }
                                          : { opacity: [0, 1, 0.65, 1] }
                                }
                                transition={{
                                    duration: 3,
                                    delay: 0.1 + i * 0.08,
                                    times: [0, 0.2, 0.6, 1],
                                }}
                            />
                        ))}
                    </svg>
                )}
                <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    // Taking over a dot: already there, already its size.
                    initial={
                        ride
                            ? false
                            : { opacity: 0, scale: reducedMotion ? 1 : 0.7 }
                    }
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                        duration: quick(1.2),
                        delay: quick(0.5),
                        ease: [0.2, 0.8, 0.2, 1],
                    }}
                >
                    <motion.div
                        animate={
                            reducedMotion || !landed
                                ? undefined
                                : { y: [0, -6, 0] }
                        }
                        transition={{
                            duration: 6,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut",
                        }}
                    >
                        <Orb body={body} moonPhase={moonPhase} ride={ride} />
                    </motion.div>
                </motion.div>
            </div>
            <motion.p
                aria-hidden
                className="-mt-6 font-mono text-[11px] text-astral-gold uppercase tracking-[0.22em] max-lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: landed ? 1 : 0 }}
                transition={{ duration: quick(0.8), delay: quick(1.2) }}
            >
                {born} · {body} en {zodiac?.glyph} {signLabel}
            </motion.p>
        </div>
    );
}
