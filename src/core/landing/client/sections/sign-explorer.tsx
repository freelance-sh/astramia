"use client";

import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Button } from "@/frontend/components/ui/button";
import { Label } from "@/frontend/components/ui/label";
import { HERO, startReadingHref } from "../../domain/content";
import {
    daysInMonth,
    getSunSign,
    MONTHS_ES,
    type ZodiacSign,
} from "../../domain/zodiac";
import { GoldButton, Magnetic, ParallaxLayer, ZodiacWheel } from "../effects";
import { MoonToday } from "./sky-today";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/** The native picker: instant on Android, no dropdown JS to hydrate. */
const FIELD =
    "h-12 w-full rounded-md border border-input bg-card/60 px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/**
 * The hero's interactive moment. Renders two grid items (the birth-date
 * picker with the CTA, and the zodiac wheel) that share one piece of state:
 * the visitor's sun sign. Nothing leaves the browser until they start the
 * quiz, which picks up the day and month so they're never asked twice.
 */
export function SignExplorer() {
    const id = useId();
    const reducedMotion = useReducedMotion();
    const [month, setMonth] = useState<string>("");
    const [day, setDay] = useState<string>("");

    const sign: ZodiacSign | undefined = useMemo(() => {
        if (!month || !day) return undefined;
        return getSunSign(Number(month), Number(day));
    }, [month, day]);

    const maxDay = month ? daysInMonth(Number(month)) : 31;
    const dayInvalid = day !== "" && Number(day) > maxDay;

    return (
        <>
            <div className="flex flex-col gap-6 [grid-area:picker]">
                <fieldset className="flex flex-col gap-3">
                    <legend className="font-display text-2xl">
                        {HERO.birthPrompt}
                    </legend>
                    <div className="mt-3 grid grid-cols-[6rem_1fr] gap-3 sm:max-w-sm">
                        <div className="grid gap-1.5">
                            <Label
                                htmlFor={`${id}-day`}
                                className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]"
                            >
                                Día
                            </Label>
                            <select
                                id={`${id}-day`}
                                aria-invalid={dayInvalid || undefined}
                                className={`${FIELD} font-mono`}
                                value={day}
                                onChange={(e) => setDay(e.target.value)}
                            >
                                <option value="">--</option>
                                {DAYS.slice(0, maxDay).map((d) => (
                                    <option key={d} value={String(d)}>
                                        {String(d).padStart(2, "0")}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label
                                htmlFor={`${id}-month`}
                                className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]"
                            >
                                Mes
                            </Label>
                            <select
                                id={`${id}-month`}
                                className={FIELD}
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                            >
                                <option value="">Elige un mes</option>
                                {MONTHS_ES.map((name, i) => (
                                    <option key={name} value={String(i + 1)}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground/80">
                        {dayInvalid
                            ? `${MONTHS_ES[Number(month) - 1]} tiene ${maxDay} días.`
                            : HERO.birthHint}
                    </p>
                </fieldset>

                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <Magnetic className="w-full sm:w-auto">
                        <GoldButton
                            size="lg"
                            asChild
                            className="group h-12 w-full rounded-full px-7 text-base sm:w-auto"
                        >
                            <Link
                                href={startReadingHref(
                                    sign && !dayInvalid
                                        ? {
                                              day: Number(day),
                                              month: Number(month),
                                          }
                                        : undefined,
                                )}
                            >
                                {sign
                                    ? HERO.ctaForSign(sign.name)
                                    : HERO.ctaDefault}
                                <ArrowRight className="transition-transform group-hover:translate-x-1" />
                            </Link>
                        </GoldButton>
                    </Magnetic>
                    <Button
                        size="lg"
                        variant="ghost"
                        asChild
                        className="h-12 rounded-full"
                    >
                        <a href="#como-funciona">Ver cómo funciona</a>
                    </Button>
                </div>

                {/* Under the button: the sign that appears on the date they
                    pick never pushes it below the fold. */}
                <div aria-live="polite">
                    <AnimatePresence mode="wait">
                        {sign && (
                            <motion.div
                                key={sign.id}
                                initial={
                                    reducedMotion
                                        ? false
                                        : { opacity: 0, y: 10 }
                                }
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{
                                    duration: 0.5,
                                    ease: [0.22, 1, 0.36, 1],
                                }}
                                className="flex gap-4 border-astral-gold/30 border-l-2 pl-4"
                            >
                                <span
                                    aria-hidden
                                    className="font-display text-5xl text-astral-gold leading-none"
                                >
                                    {sign.glyph}
                                </span>
                                <div className="flex flex-col gap-1">
                                    <p className="font-display text-2xl leading-tight">
                                        Eres{" "}
                                        <em className="text-astral-gold">
                                            {sign.name}
                                        </em>
                                        .
                                    </p>
                                    <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
                                        {sign.element} · {sign.ruler.glyph}{" "}
                                        {sign.ruler.name}
                                    </p>
                                    <p className="max-w-md text-pretty text-muted-foreground text-sm">
                                        {sign.loveTeaser}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="flex flex-col gap-6 [grid-area:wheel] lg:pl-6">
                <ParallaxLayer
                    speed={0.08}
                    className="mx-auto w-full max-w-[min(100%,26rem)] lg:max-w-none"
                >
                    <ZodiacWheel activeSign={sign?.id ?? null} />
                </ParallaxLayer>
                <MoonToday className="mx-auto w-full max-w-[26rem] lg:max-w-none" />
            </div>
        </>
    );
}
