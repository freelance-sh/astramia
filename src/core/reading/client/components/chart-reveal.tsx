"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { ShimmerText } from "@/core/landing/client/effects";
import { longDate } from "@/core/reading/domain/chart";
import type {
    AspectName,
    NatalChart,
    ReadingTopic,
} from "@/core/reading/domain/types";
import { NatalWheel, WHEEL_DRAW_STEPS } from "./natal-wheel";

/**
 * One caption every ~3.5 s: long enough to read it while it sits still. At
 * 0.75 s (the old hook pace) each one faded out before it finished fading in.
 * A short wait shows fewer captions, so the telling ones come first.
 */
const STEP_MS = 3500;
/** The wheel draws on its own, quicker clock: the hook's wait is ~5 s. */
const DRAW_MS = { teaser: 800, reading: 1700 } as const;
/** Slow, eased crossfade: the wait should feel calm, not hurried. */
const FADE = { duration: 0.8, ease: "easeInOut" } as const;

const ASPECT_ARTICLE: Record<AspectName, string> = {
    conjunción: "La conjunción",
    sextil: "El sextil",
    trígono: "El trígono",
    cuadratura: "La cuadratura",
    oposición: "La oposición",
};

function captions(
    chart: NatalChart,
    birthDate: string,
    mode: "teaser" | "reading",
    topic: ReadingTopic,
): string[] {
    const [sun, moon, venus, mars] = chart.placements;
    const moonLine = chart.moonRange
        ? `Tu Luna, entre ${chart.moonRange.early} y ${chart.moonRange.late}`
        : `Tu Luna en ${moon.sign}`;
    const aspect = chart.aspects[0];
    const aspectLine = aspect
        ? `${ASPECT_ARTICLE[aspect.name]} entre tu ${aspect.a} y tu ${aspect.b}`
        : "Uniendo los hilos de tu carta";
    const first = `Trazando el cielo del ${longDate(birthDate)}`;
    switch (topic) {
        case "compatibilidad":
            return [
                first,
                `Tu Venus en ${venus.sign}`,
                "Trazando el cielo del día en que nació esa persona",
                "Cruzando las dos cartas",
                "Buscando dónde fluyen y dónde chocan",
                "Leyendo lo que hay entre ustedes",
            ];
        case "personalidad":
            return [
                first,
                `Tu Sol en ${sun.sign}: quién eres`,
                moonLine,
                "Buscando qué signo salía por el este",
                aspectLine,
                "Leyendo quién eres",
            ];
        case "camino":
            return [
                first,
                `Tu Sol en ${sun.sign}`,
                "Ubicando a Saturno y Júpiter hoy",
                "Midiendo qué tocan en tu carta",
                "Buscando las fechas de tu año",
                "Leyendo tu momento",
            ];
        default:
            return [
                first,
                `Venus en ${venus.sign}: cómo amas`,
                moonLine,
                `Marte en ${mars.sign}: cómo deseas`,
                `Tu Sol en ${sun.sign}`,
                aspectLine,
                mode === "reading"
                    ? "Siguiendo a Venus en los próximos meses"
                    : "Buscando lo que tu carta repite",
                mode === "reading"
                    ? "Escribiendo tu lectura"
                    : "Leyendo tu carta",
            ];
    }
}

/**
 * The wait, made part of the reading: the person's own chart is drawn on a
 * zodiac wheel (their real placements and aspects) while the model writes,
 * with captions naming what is being "read", slow enough to read them. Loops
 * on the last caption.
 */
export function ChartReveal({
    chart,
    birthDate,
    mode,
    topic = "amor",
}: {
    chart: NatalChart;
    birthDate: string;
    mode: "teaser" | "reading";
    topic?: ReadingTopic;
}) {
    const reducedMotion = useReducedMotion();
    const lines = useMemo(
        () => captions(chart, birthDate, mode, topic),
        [chart, birthDate, mode, topic],
    );
    const last = lines.length - 1;
    const [step, setStep] = useState(0);
    const [drawn, setDrawn] = useState(0);

    useEffect(() => {
        if (reducedMotion) {
            setStep(last);
            return;
        }
        const timer = window.setInterval(
            () => setStep((s) => Math.min(s + 1, last)),
            STEP_MS,
        );
        return () => window.clearInterval(timer);
    }, [last, reducedMotion]);

    useEffect(() => {
        if (reducedMotion) {
            setDrawn(WHEEL_DRAW_STEPS);
            return;
        }
        const timer = window.setInterval(
            () => setDrawn((d) => Math.min(d + 1, WHEEL_DRAW_STEPS)),
            DRAW_MS[mode],
        );
        return () => window.clearInterval(timer);
    }, [mode, reducedMotion]);

    return (
        <div className="ph-mask flex flex-col items-center gap-8 py-6">
            <div className="relative aspect-square w-[min(80vw,320px)]">
                <motion.div
                    aria-hidden
                    className="absolute inset-[12%] rounded-full bg-astral-violet/20 blur-3xl"
                    animate={
                        reducedMotion
                            ? undefined
                            : {
                                  opacity: [0.4, 0.9, 0.4],
                                  scale: [0.95, 1.05, 0.95],
                              }
                    }
                    transition={{
                        duration: 6,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                    }}
                />
                <NatalWheel
                    chart={chart}
                    drawn={drawn}
                    spin
                    className="relative"
                />
            </div>

            <div className="flex min-h-14 flex-col items-center gap-2 text-center">
                <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
                    {mode === "reading"
                        ? "Tu lectura completa"
                        : "Tu carta natal"}
                </p>
                <AnimatePresence mode="wait">
                    <motion.p
                        key={step}
                        role="status"
                        aria-live="polite"
                        className="text-pretty font-display text-2xl sm:text-3xl"
                        initial={{ opacity: 0, y: reducedMotion ? 0 : 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: reducedMotion ? 0 : -4 }}
                        transition={reducedMotion ? { duration: 0 } : FADE}
                    >
                        {step === last ? (
                            <ShimmerText>{lines[step]}…</ShimmerText>
                        ) : (
                            `${lines[step]}…`
                        )}
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
    );
}
