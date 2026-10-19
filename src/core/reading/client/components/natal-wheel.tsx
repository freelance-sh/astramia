"use client";

import { motion, useReducedMotion } from "motion/react";
import { ZODIAC_SIGNS } from "@/core/landing/domain/zodiac";
import type { AspectName, NatalChart } from "@/core/reading/domain/types";
import { cn } from "@/frontend/lib/utils";

const C = 200;

/** Sun, Moon, Venus, Mars, then the aspects. */
export const WHEEL_DRAW_STEPS = 5;

/** U+FE0E keeps ♀/♂ as text glyphs instead of emoji. */
export const BODY_GLYPHS: Record<string, string> = {
    Sol: "☉︎",
    Luna: "☾︎",
    Mercurio: "☿︎",
    Venus: "♀︎",
    Marte: "♂︎",
    Júpiter: "♃︎",
    Saturno: "♄︎",
    Urano: "♅︎",
    Neptuno: "♆︎",
    Plutón: "♇︎",
    Ascendente: "AC",
};

export const ASPECT_COLOR: Record<AspectName, string> = {
    conjunción: "var(--astral-violet)",
    sextil: "var(--astral-cyan)",
    trígono: "var(--astral-gold)",
    cuadratura: "var(--astral-rose)",
    oposición: "var(--astral-rose)",
};

/**
 * 0° Aries on the left and the zodiac running counter-clockwise, as natal
 * charts are drawn. Rounded so server and client markup match (hydration).
 */
export function point(longitude: number, radius: number) {
    const angle = ((180 + longitude) * Math.PI) / 180;
    return {
        x: Math.round((C + radius * Math.cos(angle)) * 100) / 100,
        y: Math.round((C - radius * Math.sin(angle)) * 100) / 100,
    };
}

/**
 * The person's chart on a zodiac wheel: their real placements and aspects.
 * `drawn` reveals the bodies one by one, then the aspects.
 */
export function NatalWheel({
    chart,
    drawn = WHEEL_DRAW_STEPS,
    spin = false,
    litAspects = false,
    className,
}: {
    chart: NatalChart;
    /** How many of the WHEEL_DRAW_STEPS are shown. */
    drawn?: number;
    /** A very slow turn, once fully drawn. */
    spin?: boolean;
    /** The aspects glow and pulse: the tensions a chapter talks about. */
    litAspects?: boolean;
    className?: string;
}) {
    const reducedMotion = useReducedMotion();
    const duration = reducedMotion ? 0 : 0.9;

    // Conjunct planets would overlap: the later ones move inwards.
    const placed = chart.placements.map((p, i, all) => {
        const crowded = all
            .slice(0, i)
            .some(
                (q) =>
                    Math.abs(((p.longitude - q.longitude + 540) % 360) - 180) <
                    10,
            );
        return { ...p, ...point(p.longitude, crowded ? 92 : 118) };
    });
    const byBody = new Map(placed.map((p) => [p.body, p]));

    return (
        <motion.svg
            viewBox="0 0 400 400"
            aria-hidden="true"
            className={cn("h-full w-full overflow-visible", className)}
            animate={
                reducedMotion || !spin || drawn < WHEEL_DRAW_STEPS
                    ? undefined
                    : { rotate: 360 }
            }
            transition={{
                duration: 240,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
            }}
        >
            <motion.circle
                cx={C}
                cy={C}
                r={190}
                fill="none"
                stroke="var(--astral-gold)"
                strokeOpacity={0.6}
                strokeWidth={1.2}
                initial={{ pathLength: reducedMotion ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                    duration: reducedMotion ? 0 : 1.4,
                    ease: "easeInOut",
                }}
            />
            <circle
                cx={C}
                cy={C}
                r={150}
                fill="none"
                stroke="var(--astral-ink)"
                strokeWidth={1}
            />
            {ZODIAC_SIGNS.map((sign, i) => {
                const from = point(i * 30, 150);
                const to = point(i * 30, 190);
                const label = point(i * 30 + 15, 170);
                const own = placed.some((p) => p.sign === sign.name);
                return (
                    <g key={sign.id}>
                        <line
                            x1={from.x}
                            y1={from.y}
                            x2={to.x}
                            y2={to.y}
                            stroke="var(--astral-ink)"
                            strokeWidth={1}
                        />
                        <motion.text
                            x={label.x}
                            y={label.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={16}
                            fill={own ? "var(--astral-gold)" : "currentColor"}
                            className="text-muted-foreground"
                            initial={{ opacity: reducedMotion ? 1 : 0 }}
                            animate={{ opacity: own ? 1 : 0.55 }}
                            transition={{
                                duration,
                                delay: reducedMotion ? 0 : 0.4 + i * 0.05,
                            }}
                        >
                            {sign.glyph}
                        </motion.text>
                    </g>
                );
            })}

            {chart.aspects.map((aspect) => {
                const a = byBody.get(aspect.a);
                const b = byBody.get(aspect.b);
                if (!a || !b) return null;
                const shown = drawn >= WHEEL_DRAW_STEPS;
                return (
                    <motion.line
                        key={`${aspect.a}-${aspect.b}`}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={ASPECT_COLOR[aspect.name]}
                        strokeWidth={litAspects ? 2.5 : 1.5}
                        strokeLinecap="round"
                        style={
                            litAspects
                                ? {
                                      filter: `drop-shadow(0 0 6px ${ASPECT_COLOR[aspect.name]})`,
                                  }
                                : undefined
                        }
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={
                            !shown
                                ? { pathLength: 0, opacity: 0 }
                                : litAspects && !reducedMotion
                                  ? {
                                        pathLength: 1,
                                        opacity: [0.95, 0.5, 0.95],
                                    }
                                  : { pathLength: 1, opacity: 0.85 }
                        }
                        transition={{
                            pathLength: {
                                duration: reducedMotion ? 0 : 1.2,
                                ease: "easeInOut",
                            },
                            opacity: litAspects
                                ? {
                                      duration: 3,
                                      repeat: Number.POSITIVE_INFINITY,
                                      ease: "easeInOut",
                                  }
                                : { duration: reducedMotion ? 0 : 1.2 },
                        }}
                    />
                );
            })}

            {placed.map((p, i) => {
                const shown = drawn >= i + 1;
                return (
                    <motion.g
                        key={p.body}
                        initial={{ opacity: 0, scale: 0.3 }}
                        animate={
                            shown
                                ? { opacity: 1, scale: 1 }
                                : { opacity: 0, scale: 0.3 }
                        }
                        transition={{ duration, ease: [0.2, 0.8, 0.2, 1] }}
                        style={{
                            transformBox: "fill-box",
                            transformOrigin: "center",
                        }}
                    >
                        <circle
                            cx={p.x}
                            cy={p.y}
                            r={17}
                            fill="var(--astral-void)"
                            stroke="var(--astral-gold)"
                            strokeOpacity={0.8}
                            strokeDasharray={
                                p.body === "Luna" && chart.moonRange
                                    ? "3 4"
                                    : undefined
                            }
                        />
                        <text
                            x={p.x}
                            y={p.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={18}
                            fill="var(--astral-gold)"
                        >
                            {BODY_GLYPHS[p.body] ?? p.body[0]}
                        </text>
                    </motion.g>
                );
            })}
        </motion.svg>
    );
}
