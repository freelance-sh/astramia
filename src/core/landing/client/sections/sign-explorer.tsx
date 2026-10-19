"use client";

import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Button } from "@/frontend/components/ui/button";
import { Label } from "@/frontend/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/frontend/components/ui/select";
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
                            <Select value={day} onValueChange={setDay}>
                                <SelectTrigger
                                    id={`${id}-day`}
                                    aria-invalid={dayInvalid || undefined}
                                    className="h-12 w-full bg-card/60 font-mono text-base backdrop-blur data-[size=default]:h-12"
                                >
                                    <SelectValue placeholder="--" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DAYS.slice(0, maxDay).map((d) => (
                                        <SelectItem
                                            key={d}
                                            value={String(d)}
                                            className="font-mono"
                                        >
                                            {String(d).padStart(2, "0")}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label
                                htmlFor={`${id}-month`}
                                className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]"
                            >
                                Mes
                            </Label>
                            <Select value={month} onValueChange={setMonth}>
                                <SelectTrigger
                                    id={`${id}-month`}
                                    className="h-12 w-full bg-card/60 text-base backdrop-blur data-[size=default]:h-12"
                                >
                                    <SelectValue placeholder="Elige un mes" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTHS_ES.map((name, i) => (
                                        <SelectItem
                                            key={name}
                                            value={String(i + 1)}
                                        >
                                            {name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                                        : {
                                              opacity: 0,
                                              y: 10,
                                              filter: "blur(4px)",
                                          }
                                }
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    filter: "blur(0px)",
                                }}
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
