"use client";

import { motion, useReducedMotion } from "motion/react";
import { MONTHS_ES, ZODIAC_SIGNS } from "@/core/landing/domain/zodiac";
import type { PathEvent } from "@/core/reading/domain/transits";
import type { NatalPlacement } from "@/core/reading/domain/types";
import { BODY_GLYPHS, point } from "../../components/natal-wheel";

const WHEEL_SIZE = "w-[min(74vw,360px)] lg:w-[540px]";
const C = 200;

const glyphOf = (sign: string) =>
    ZODIAC_SIGNS.find((s) => s.name === sign)?.glyph ?? "";

/** Conjunct bodies would overlap: the later ones move inwards. */
function placed(bodies: readonly NatalPlacement[], radius: number, step = 20) {
    return bodies.map((p, i, all) => {
        const crowded = all
            .slice(0, i)
            .some(
                (q) =>
                    Math.abs(((p.longitude - q.longitude + 540) % 360) - 180) <
                    12,
            );
        return {
            ...p,
            ...point(p.longitude, crowded ? radius - step : radius),
        };
    });
}

function ZodiacRing({ lit }: { lit: ReadonlySet<string> }) {
    const reducedMotion = useReducedMotion();
    return (
        <g>
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
                transition={{ duration: reducedMotion ? 0 : 1.4 }}
            />
            <circle
                cx={C}
                cy={C}
                r={158}
                fill="none"
                stroke="var(--astral-ink)"
            />
            {ZODIAC_SIGNS.map((sign, i) => {
                const from = point(i * 30, 158);
                const to = point(i * 30, 190);
                const label = point(i * 30 + 15, 174);
                const own = lit.has(sign.name);
                return (
                    <g key={sign.id}>
                        <line
                            x1={from.x}
                            y1={from.y}
                            x2={to.x}
                            y2={to.y}
                            stroke="var(--astral-ink)"
                        />
                        <text
                            x={label.x}
                            y={label.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={14}
                            fill={own ? "var(--astral-gold)" : "currentColor"}
                            opacity={own ? 1 : 0.5}
                            className="text-muted-foreground"
                        >
                            {sign.glyph}
                        </text>
                    </g>
                );
            })}
        </g>
    );
}

function BodyMark({
    body,
    x,
    y,
    color,
    lit,
    dimmed,
    delay,
}: {
    body: string;
    x: number;
    y: number;
    color: string;
    lit: boolean;
    dimmed: boolean;
    delay: number;
}) {
    const reducedMotion = useReducedMotion();
    return (
        <motion.g
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: dimmed ? 0.4 : 1, scale: lit ? 1.18 : 1 }}
            transition={{
                duration: reducedMotion ? 0 : 0.7,
                delay: reducedMotion ? 0 : delay,
                ease: [0.2, 0.8, 0.2, 1],
            }}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
            <circle
                cx={x}
                cy={y}
                r={13}
                fill="var(--astral-void)"
                stroke={color}
                strokeWidth={lit ? 2 : 1}
                style={
                    lit
                        ? { filter: `drop-shadow(0 0 8px ${color})` }
                        : undefined
                }
            />
            <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={body === "Ascendente" ? 10 : 15}
                fill={color}
            >
                {BODY_GLYPHS[body] ?? body[0]}
            </text>
        </motion.g>
    );
}

/**
 * Two sets of bodies on one zodiac: one inside, one outside, and a line
 * between the two points a step talks about.
 */
function TwoRings({
    inner,
    outer,
    innerColor,
    outerColor,
    focus,
    labels,
}: {
    inner: readonly NatalPlacement[];
    outer: readonly NatalPlacement[];
    innerColor: string;
    outerColor: string;
    focus?: { inner?: string; outer?: string };
    /** Whose bodies are whose, said in the middle in their colour. */
    labels: { inner: string; outer: string };
}) {
    const reducedMotion = useReducedMotion();
    const mine = placed(inner, 82);
    const theirs = placed(outer, 136, 18);
    const a = mine.find((p) => p.body === focus?.inner);
    const b = theirs.find((p) => p.body === focus?.outer);
    const focused = Boolean(a || b);
    const lit = new Set([...inner, ...outer].map((p) => p.sign));

    return (
        <div className="flex h-full w-full flex-col items-center justify-start gap-4 pt-4 lg:justify-center lg:gap-5 lg:pt-0">
            <div className={`relative aspect-square ${WHEEL_SIZE}`}>
                <div
                    aria-hidden
                    className="absolute inset-[14%] rounded-full bg-astral-violet/20 blur-3xl"
                />
                <svg
                    viewBox="0 0 400 400"
                    aria-hidden="true"
                    className="relative h-full w-full overflow-visible"
                >
                    <ZodiacRing lit={lit} />
                    <circle
                        cx={C}
                        cy={C}
                        r={108}
                        fill="none"
                        stroke="var(--astral-ink)"
                        strokeDasharray="2 5"
                    />
                    {/* Below the text over the scene there's no room for a caption. */}
                    <text
                        x={C}
                        y={C - 9}
                        textAnchor="middle"
                        fontSize={11}
                        letterSpacing={2}
                        fill={innerColor}
                    >
                        {labels.inner.toUpperCase()}
                    </text>
                    <text
                        x={C}
                        y={C + 11}
                        textAnchor="middle"
                        fontSize={11}
                        letterSpacing={2}
                        fill={outerColor}
                    >
                        {labels.outer.toUpperCase()}
                    </text>
                    {a && b && (
                        <motion.line
                            key={`${a.body}-${b.body}`}
                            x1={a.x}
                            y1={a.y}
                            x2={b.x}
                            y2={b.y}
                            stroke="var(--astral-gold)"
                            strokeWidth={2}
                            strokeLinecap="round"
                            style={{
                                filter: "drop-shadow(0 0 6px var(--astral-gold))",
                            }}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 0.9 }}
                            transition={{
                                duration: reducedMotion ? 0 : 1.1,
                                delay: reducedMotion ? 0 : 0.3,
                                ease: "easeInOut",
                            }}
                        />
                    )}
                    {mine.map((p, i) => (
                        <BodyMark
                            key={`in-${p.body}`}
                            body={p.body}
                            x={p.x}
                            y={p.y}
                            color={innerColor}
                            lit={p.body === focus?.inner}
                            dimmed={focused && p.body !== focus?.inner}
                            delay={0.5 + i * 0.12}
                        />
                    ))}
                    {theirs.map((p, i) => (
                        <BodyMark
                            key={`out-${p.body}`}
                            body={p.body}
                            x={p.x}
                            y={p.y}
                            color={outerColor}
                            lit={p.body === focus?.outer}
                            dimmed={focused && p.body !== focus?.outer}
                            delay={0.9 + i * 0.12}
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
}

/** Their chart inside, the other person's outside. */
export function SynastryScene({
    mine,
    theirs,
    focus,
}: {
    mine: readonly NatalPlacement[];
    theirs: readonly NatalPlacement[];
    focus?: readonly [string, string];
}) {
    return (
        <TwoRings
            inner={mine}
            outer={theirs}
            innerColor="var(--astral-gold)"
            outerColor="var(--astral-rose)"
            focus={focus && { inner: focus[0], outer: focus[1] }}
            labels={{ inner: "Tú", outer: "Esa persona" }}
        />
    );
}

/** Their chart inside, the slow planets today outside. */
export function TransitsScene({
    natal,
    sky,
    focus,
}: {
    natal: readonly NatalPlacement[];
    sky: readonly NatalPlacement[];
    focus?: { body: string; natal?: string };
}) {
    return (
        <TwoRings
            inner={natal}
            outer={sky}
            innerColor="var(--astral-gold)"
            outerColor="var(--astral-cyan)"
            focus={focus && { inner: focus.natal, outer: focus.body }}
            labels={{
                inner: "Tu carta adentro",
                outer: "El cielo de hoy afuera",
            }}
        />
    );
}

/**
 * The east the moment they were born: their rising sign coming up over the
 * horizon, and their Sun high above when the step sets one against the other.
 */
export function RisingScene({
    sign,
    near,
    sun,
}: {
    sign: string;
    near: string | null;
    sun?: string;
}) {
    const reducedMotion = useReducedMotion();
    const quick = (seconds: number) => (reducedMotion ? 0 : seconds);
    return (
        <div className="flex h-full w-full items-start justify-center pt-4 lg:items-center lg:pt-0">
            <svg
                viewBox="0 0 400 400"
                aria-hidden="true"
                className={`aspect-square overflow-visible ${WHEEL_SIZE}`}
            >
                <defs>
                    <radialGradient
                        id="rising-dawn"
                        cx="0.28"
                        cy="0.66"
                        r="0.6"
                    >
                        <stop
                            offset="0%"
                            stopColor="var(--astral-gold)"
                            stopOpacity={0.35}
                        />
                        <stop
                            offset="100%"
                            stopColor="var(--astral-gold)"
                            stopOpacity={0}
                        />
                    </radialGradient>
                </defs>
                <motion.rect
                    x={0}
                    y={0}
                    width={400}
                    height={265}
                    fill="url(#rising-dawn)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: quick(2) }}
                />
                <motion.g
                    initial={{ y: quick(110), opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                        duration: quick(2.4),
                        ease: [0.25, 0.8, 0.3, 1],
                    }}
                >
                    <text
                        x={112}
                        y={192}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={84}
                        fill="var(--astral-gold)"
                        style={{
                            filter: "drop-shadow(0 0 18px var(--astral-gold))",
                        }}
                    >
                        {glyphOf(sign)}
                    </text>
                </motion.g>
                {/* Below the horizon: the earth hides what hasn't risen. */}
                <rect
                    x={-40}
                    y={265}
                    width={480}
                    height={135}
                    fill="var(--astral-void)"
                />
                <motion.line
                    x1={0}
                    y1={265}
                    x2={400}
                    y2={265}
                    stroke="var(--astral-gold)"
                    strokeOpacity={0.7}
                    initial={{ pathLength: reducedMotion ? 1 : 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: quick(1.2) }}
                />
                <text
                    x={112}
                    y={290}
                    textAnchor="middle"
                    fontSize={13}
                    letterSpacing={3}
                    fill="var(--astral-gold)"
                >
                    ESTE · {sign.toUpperCase()}
                </text>
                {near && (
                    <text
                        x={112}
                        y={310}
                        textAnchor="middle"
                        fontSize={11}
                        className="fill-muted-foreground"
                    >
                        o {near}, si la hora varía unos minutos
                    </text>
                )}
                {sun && (
                    <motion.g
                        initial={{ opacity: 0, y: quick(-16) }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: quick(1.2), delay: quick(0.3) }}
                    >
                        <circle
                            cx={292}
                            cy={92}
                            r={26}
                            fill="var(--astral-void)"
                            stroke="var(--astral-gold)"
                            style={{
                                filter: "drop-shadow(0 0 14px var(--astral-gold))",
                            }}
                        />
                        <text
                            x={292}
                            y={92}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={26}
                            fill="var(--astral-gold)"
                        >
                            {BODY_GLYPHS.Sol}
                        </text>
                        <text
                            x={292}
                            y={140}
                            textAnchor="middle"
                            fontSize={12}
                            letterSpacing={2}
                            className="fill-muted-foreground"
                        >
                            SOL · {sun.toUpperCase()} {glyphOf(sun)}
                        </text>
                    </motion.g>
                )}
            </svg>
        </div>
    );
}

const X0 = 46;
const X1 = 380;
const DAYS = 365;
const xOf = (day: number) => X0 + ((X1 - X0) * Math.min(day, DAYS)) / DAYS;

/**
 * The year ahead as a line: a row per slow planet, a mark on each of its
 * moments, the one being read lit with its date.
 */
export function PathScene({
    events,
    focus,
}: {
    events: readonly PathEvent[];
    focus?: number;
}) {
    const reducedMotion = useReducedMotion();
    const bodies: string[] = [...new Set(events.map((e) => e.body))];
    const rowY = (body: string) =>
        bodies.length < 2
            ? 150
            : 90 + (130 * bodies.indexOf(body)) / (bodies.length - 1);
    // The reading's day: the first event's date minus its days ahead.
    const start = events[0]
        ? new Date(Date.parse(events[0].date) - events[0].day * 86_400_000)
        : new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
        const at = new Date(
            Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i + 1, 1),
        );
        return {
            label: MONTHS_ES[at.getUTCMonth()].slice(0, 3),
            day: (at.getTime() - start.getTime()) / 86_400_000,
        };
    }).filter((m) => m.day > 20 && m.day < DAYS);
    const lit = focus === undefined ? undefined : events[focus];

    return (
        <div className="flex h-full w-full items-start justify-center pt-6 lg:items-center lg:pt-0">
            <svg
                viewBox="0 0 400 300"
                aria-hidden="true"
                className="w-[min(92vw,420px)] overflow-visible lg:w-[600px]"
            >
                <line
                    x1={X0}
                    y1={250}
                    x2={X1}
                    y2={250}
                    stroke="var(--astral-ink)"
                />
                <text
                    x={X0}
                    y={272}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--astral-gold)"
                >
                    HOY
                </text>
                {months.map((m) => (
                    <g key={m.label + m.day}>
                        <line
                            x1={xOf(m.day)}
                            y1={246}
                            x2={xOf(m.day)}
                            y2={254}
                            stroke="var(--astral-ink)"
                        />
                        <text
                            x={xOf(m.day)}
                            y={272}
                            textAnchor="middle"
                            fontSize={10}
                            className="fill-muted-foreground"
                        >
                            {m.label}
                        </text>
                    </g>
                ))}
                {bodies.map((body) => (
                    <g key={body}>
                        <line
                            x1={X0}
                            y1={rowY(body)}
                            x2={X1}
                            y2={rowY(body)}
                            stroke="var(--astral-ink)"
                            strokeDasharray="2 6"
                        />
                        <text
                            x={18}
                            y={rowY(body)}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={18}
                            fill="var(--astral-cyan)"
                        >
                            {BODY_GLYPHS[body]}
                        </text>
                    </g>
                ))}
                {events.map((e, i) => {
                    const on = i === focus;
                    return (
                        <motion.circle
                            key={`${e.date}-${e.body}-${e.kind}`}
                            cx={xOf(e.day)}
                            cy={rowY(e.body)}
                            fill={
                                on ? "var(--astral-gold)" : "var(--astral-cyan)"
                            }
                            initial={{ r: 0, opacity: 0 }}
                            animate={{
                                r: on ? 8 : 5,
                                opacity: focus === undefined || on ? 1 : 0.45,
                            }}
                            transition={{
                                duration: reducedMotion ? 0 : 0.6,
                                delay: reducedMotion ? 0 : 0.2 + i * 0.08,
                            }}
                            style={
                                on
                                    ? {
                                          filter: "drop-shadow(0 0 8px var(--astral-gold))",
                                      }
                                    : undefined
                            }
                        />
                    );
                })}
                {lit && (
                    <motion.text
                        key={focus}
                        // Near its mark, but whole on screen.
                        x={Math.min(Math.max(xOf(lit.day), 160), 240)}
                        y={rowY(lit.body) - 20}
                        textAnchor="middle"
                        fontSize={12}
                        letterSpacing={1.5}
                        fill="var(--astral-gold)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: reducedMotion ? 0 : 0.6 }}
                    >
                        {lit.when.toUpperCase()} · {glyphOf(lit.sign)}{" "}
                        {lit.sign.toUpperCase()}
                    </motion.text>
                )}
            </svg>
        </div>
    );
}
