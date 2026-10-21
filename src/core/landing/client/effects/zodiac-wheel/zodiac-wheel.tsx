"use client";

import {
    animate,
    motion,
    useAnimationFrame,
    useInView,
    useMotionValue,
    useReducedMotion,
    useScroll,
    useTransform,
} from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/frontend/lib/utils";
import { ZODIAC_SIGNS, type ZodiacSignId } from "../../../domain/zodiac";
import styles from "./zodiac-wheel.module.css";

const CENTER = 200;
const SIGN_RADIUS = 172;
const TICK_COUNT = 72;
/** Degrees per millisecond while idling (one turn every ~160 s). */
const IDLE_SPEED = 360 / 160_000;
/** Scroll pixels that produce a quarter turn of the outer wheel. */
const SCROLL_TURN_PX = 1600;

function polar(radius: number, index: number, total: number) {
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    // Rounded so server and client markup agree bit for bit (hydration).
    return {
        x: Math.round((CENTER + radius * Math.cos(angle)) * 100) / 100,
        y: Math.round((CENTER + radius * Math.sin(angle)) * 100) / 100,
    };
}

/** Shortest signed rotation from `current` so that sign `index` sits on top. */
function rotationTo(current: number, index: number) {
    const desired = -(index + 0.5) * 30;
    const delta = ((((desired - current) % 360) + 540) % 360) - 180;
    return current + delta;
}

// A loose, hand-drawn constellation that sits inside the hub.
const CONSTELLATION = [
    [140, 150],
    [182, 128],
    [228, 146],
    [256, 196],
    [232, 248],
    [176, 262],
] as const;

interface ZodiacWheelProps {
    /** When set, the wheel stops drifting and swings this sign to the top. */
    activeSign?: ZodiacSignId | null;
    className?: string;
}

/**
 * Astrological wheel. Idles with a slow drift, rotates with the page
 * scroll, and when a sign is resolved it springs that sign to the top with
 * a burst. Decorative: the sign name is announced by the form that sets it.
 */
export function ZodiacWheel({ activeSign, className }: ZodiacWheelProps) {
    const reducedMotion = useReducedMotion();
    const rootRef = useRef<HTMLDivElement>(null);
    const inView = useInView(rootRef, { margin: "120px" });
    const rotate = useMotionValue(0);
    const { scrollY } = useScroll();
    const scrollRotate = useTransform(scrollY, (y) =>
        reducedMotion ? 0 : (y / SCROLL_TURN_PX) * 90,
    );
    const activeRef = useRef<ZodiacSignId | null | undefined>(activeSign);
    activeRef.current = activeSign;

    // Idling off-screen is wasted work on every phone.
    useAnimationFrame((_, delta) => {
        if (!inView || activeRef.current || reducedMotion) return;
        rotate.set(rotate.get() + delta * IDLE_SPEED);
    });

    useEffect(() => {
        if (!activeSign) return;
        const index = ZODIAC_SIGNS.findIndex((s) => s.id === activeSign);
        if (index < 0) return;
        const target = rotationTo(rotate.get(), index);
        if (reducedMotion) {
            rotate.set(target);
            return;
        }
        const controls = animate(rotate, target, {
            type: "spring",
            stiffness: 48,
            damping: 13,
            mass: 1.1,
        });
        return () => controls.stop();
    }, [activeSign, reducedMotion, rotate]);

    const active = ZODIAC_SIGNS.find((s) => s.id === activeSign);

    return (
        <div
            ref={rootRef}
            aria-hidden
            className={cn(
                styles.root,
                "ph-no-capture",
                active && styles.hasActive,
                className,
            )}
        >
            <div className={styles.halo} />

            {/* Rotating layer: ring, ticks, sign glyphs, orbiting planets */}
            <motion.div
                className={styles.layer}
                style={{ rotate: scrollRotate }}
            >
                <motion.div className={styles.layer} style={{ rotate }}>
                    <svg
                        viewBox="0 0 400 400"
                        aria-hidden="true"
                        className={styles.svg}
                    >
                        <defs>
                            <linearGradient
                                id="astramia-ring"
                                x1="0"
                                y1="0"
                                x2="1"
                                y2="1"
                            >
                                <stop
                                    offset="0%"
                                    stopColor="var(--astral-gold)"
                                    stopOpacity="0.9"
                                />
                                <stop
                                    offset="50%"
                                    stopColor="var(--astral-violet)"
                                    stopOpacity="0.2"
                                />
                                <stop
                                    offset="100%"
                                    stopColor="var(--astral-rose)"
                                    stopOpacity="0.8"
                                />
                            </linearGradient>
                        </defs>
                        <circle
                            cx={CENTER}
                            cy={CENTER}
                            r="194"
                            className={styles.ring}
                            stroke="url(#astramia-ring)"
                        />
                        <circle
                            cx={CENTER}
                            cy={CENTER}
                            r="150"
                            className={styles.ringFaint}
                        />
                        {Array.from({ length: TICK_COUNT }, (_, i) => {
                            const inner = polar(
                                i % 6 === 0 ? 182 : 188,
                                i,
                                TICK_COUNT,
                            );
                            const outer = polar(194, i, TICK_COUNT);
                            return (
                                <line
                                    key={i}
                                    x1={inner.x}
                                    y1={inner.y}
                                    x2={outer.x}
                                    y2={outer.y}
                                    className={styles.tick}
                                />
                            );
                        })}
                        {ZODIAC_SIGNS.map((sign, i) => {
                            const { x, y } = polar(SIGN_RADIUS, i + 0.5, 12);
                            const isActive = sign.id === activeSign;
                            return (
                                <g key={sign.id}>
                                    {isActive && (
                                        <circle
                                            key={`${sign.id}-burst`}
                                            cx={x}
                                            cy={y}
                                            r="14"
                                            className={styles.burst}
                                        />
                                    )}
                                    <text
                                        x={x}
                                        y={y}
                                        className={cn(
                                            styles.sign,
                                            isActive && styles.signActive,
                                            active &&
                                                !isActive &&
                                                styles.signDim,
                                        )}
                                    >
                                        {sign.glyph}
                                    </text>
                                </g>
                            );
                        })}
                        <g className={styles.middle}>
                            <circle
                                cx={CENTER}
                                cy={CENTER}
                                r="118"
                                className={styles.ringDashed}
                            />
                            <circle
                                cx={CENTER}
                                cy={CENTER - 118}
                                r="4"
                                className={styles.planetGold}
                            />
                            <circle
                                cx={CENTER + 118}
                                cy={CENTER}
                                r="2.5"
                                className={styles.planetRose}
                            />
                        </g>
                        <g className={styles.inner}>
                            <circle
                                cx={CENTER}
                                cy={CENTER}
                                r="84"
                                className={styles.ringFaint}
                            />
                            <circle
                                cx={CENTER - 84}
                                cy={CENTER}
                                r="3"
                                className={styles.planetCyan}
                            />
                        </g>
                    </svg>
                </motion.div>
            </motion.div>

            {/* Static layer: pointer, constellation, hub */}
            <svg
                viewBox="0 0 400 400"
                aria-hidden="true"
                className={cn(styles.svg, styles.overlay)}
            >
                <defs>
                    <radialGradient
                        id="astramia-core"
                        cx="50%"
                        cy="50%"
                        r="50%"
                    >
                        <stop offset="0%" stopColor="oklch(0.97 0.05 85)" />
                        <stop offset="35%" stopColor="var(--astral-gold)" />
                        <stop
                            offset="70%"
                            stopColor="var(--astral-violet)"
                            stopOpacity="0.5"
                        />
                        <stop
                            offset="100%"
                            stopColor="var(--astral-violet)"
                            stopOpacity="0"
                        />
                    </radialGradient>
                </defs>
                {/* Top pointer marks where the active sign lands */}
                <path d="M200 2 L206 14 L194 14 Z" className={styles.pointer} />
                <polyline
                    points={CONSTELLATION.map((p) => p.join(",")).join(" ")}
                    className={styles.constellation}
                />
                {CONSTELLATION.map(([x, y]) => (
                    <circle
                        key={`${x}-${y}`}
                        cx={x}
                        cy={y}
                        r="1.8"
                        className={styles.node}
                    />
                ))}
                <circle
                    cx={CENTER}
                    cy={CENTER}
                    r="58"
                    fill="url(#astramia-core)"
                    className={styles.core}
                />
                {active && (
                    <g key={active.id} className={styles.hub}>
                        <circle
                            cx={CENTER}
                            cy={CENTER}
                            r="70"
                            className={styles.hubRing}
                        />
                        <text
                            x={CENTER}
                            y={CENTER + 2}
                            className={styles.hubGlyph}
                        >
                            {active.glyph}
                        </text>
                    </g>
                )}
            </svg>
        </div>
    );
}
