"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { metaCustomEvent, metaEvent } from "@/core/analytics/client/meta-pixel";
import { track } from "@/core/analytics/client/track";
import { GoldButton } from "@/core/landing/client/effects";
import { MONTHS_ES } from "@/core/landing/domain/zodiac";
import { PRIVACY_COMMITMENTS } from "@/core/legal/domain/policies";
import { natalChart } from "@/core/reading/domain/chart";
import {
    chosen,
    labelFor,
    optionsFor,
    pruneAnswers,
    type QuizQuestion,
    questionFor,
    questionsFor,
    quizLength,
} from "@/core/reading/domain/quiz";
import {
    createdReadingSchema,
    createReadingSchema,
} from "@/core/reading/domain/schemas";
import type {
    CreateReading,
    NatalChart,
    Place,
    QuizAnswer,
    ReadingTopic,
} from "@/core/reading/domain/types";
import { authClient } from "@/frontend/auth/auth";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/frontend/components/ui/select";
import { Spinner } from "@/frontend/components/ui/spinner";
import { useReadings } from "../hooks";
import { ChartReveal } from "./chart-reveal";
import { PlaceSearch } from "./place-search";
import { RankQuestion } from "./rank-question";

/** Anonymous session first, so the reading has an owner without a sign-up. */
async function ensureSession(): Promise<void> {
    const { data } = await authClient.getSession();
    if (data) return;
    const { error } = await authClient.signIn.anonymous();
    if (error) throw new Error(error.message ?? "No pudimos iniciar tu sesión");
}

/** The order they gave this question, if they ranked it. */
function rankingOf(
    answers: readonly QuizAnswer[],
    questionId: string,
): string[] | undefined {
    const given = answers.find((a) => a.questionId === questionId);
    return given && "ranking" in given ? given.ranking : undefined;
}

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

/** "YYYY-MM-DD" from the three fields, or what to fix. */
function toBirthDate(birth: {
    day: string;
    month: string;
    year: string;
}): { date: string } | { error: string } {
    const { day, month, year } = birth;
    if (!day || !month || !/^\d{4}$/.test(year))
        return { error: "Completa tu fecha de nacimiento: día, mes y año" };
    const last = new Date(
        Date.UTC(Number(year), Number(month), 0),
    ).getUTCDate();
    if (Number(day) > last)
        return {
            error: `En ${year}, ${MONTHS_ES[Number(month) - 1]} tuvo ${last} días`,
        };
    return {
        date: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    };
}

/** What the birth step says, per reading: why each field is asked. */
const BIRTH_COPY: Record<
    ReadingTopic,
    { title: string; help: string; knownHelp: string }
> = {
    amor: {
        title: "¿Cuándo naciste?",
        help: "Con la fecha basta. Si sabes la hora, tu Luna queda exacta.",
        knownHelp:
            "El día y el mes ya nos los diste. Con el año ubicamos tu Venus y tu Marte; con la hora, si la sabes, tu Luna queda exacta.",
    },
    compatibilidad: {
        title: "¿Cuándo nacieron?",
        help: "Con las dos fechas cruzamos sus cartas. Si saben la hora, sus Lunas quedan exactas.",
        knownHelp:
            "Tu día y tu mes ya nos los diste. Con los años cruzamos sus cartas; con la hora, si la saben, sus Lunas quedan exactas.",
    },
    personalidad: {
        title: "¿Cuándo y dónde naciste?",
        help: "Tu Ascendente cambia de signo cada dos horas y depende del lugar: por eso la hora y la ciudad.",
        knownHelp:
            "El día y el mes ya nos los diste. Tu Ascendente cambia de signo cada dos horas y depende del lugar: por eso la hora y la ciudad.",
    },
    camino: {
        title: "¿Cuándo naciste?",
        help: "Con la fecha vemos qué tocan Saturno y Júpiter en tu carta este año. Si sabes la hora, también tu Luna.",
        knownHelp:
            "El día y el mes ya nos los diste. Con el año vemos qué tocan Saturno y Júpiter en tu carta; con la hora, si la sabes, también tu Luna.",
    },
};

/** Who the other person is, as their answers named them. */
const THEM: Record<string, string> = {
    pareja: "Tu pareja",
    gusta: "Esa persona",
    sin_nombre: "Esa persona",
    ex: "Tu ex",
};

interface DateValue {
    day: string;
    month: string;
    year: string;
}

/** Day, month and year: two lists and the year typed. */
function DateFields({
    id,
    legend,
    value,
    onChange,
    yearRef,
}: {
    id: string;
    legend: string;
    value: DateValue;
    onChange: (value: Partial<DateValue>) => void;
    yearRef?: React.Ref<HTMLInputElement>;
}) {
    return (
        <fieldset className="grid grid-cols-[4.5rem_1fr_5.5rem] gap-3">
            <legend className="sr-only">{legend}</legend>
            <div className="flex flex-col gap-2">
                <Label htmlFor={`${id}-day`}>Día</Label>
                <Select
                    value={value.day}
                    onValueChange={(day) => onChange({ day })}
                >
                    <SelectTrigger
                        id={`${id}-day`}
                        className="w-full font-mono"
                    >
                        <SelectValue placeholder="--" />
                    </SelectTrigger>
                    <SelectContent>
                        {DAYS.map((d) => (
                            <SelectItem key={d} value={d} className="font-mono">
                                {d.padStart(2, "0")}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor={`${id}-month`}>Mes</Label>
                <Select
                    value={value.month}
                    onValueChange={(month) => onChange({ month })}
                >
                    <SelectTrigger id={`${id}-month`} className="w-full">
                        <SelectValue placeholder="Mes" />
                    </SelectTrigger>
                    <SelectContent>
                        {MONTHS_ES.map((name, i) => (
                            <SelectItem key={name} value={String(i + 1)}>
                                {name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor={`${id}-year`}>Año</Label>
                <Input
                    id={`${id}-year`}
                    ref={yearRef}
                    inputMode="numeric"
                    autoComplete={id === "birth" ? "bday-year" : "off"}
                    placeholder="1995"
                    maxLength={4}
                    required
                    className="font-mono"
                    value={value.year}
                    onChange={(e) =>
                        onChange({ year: e.target.value.replace(/\D/g, "") })
                    }
                />
            </div>
        </fieldset>
    );
}

export function QuizFlow({
    topic,
    questions,
    knownBirthDay,
}: {
    topic: ReadingTopic;
    questions: readonly QuizQuestion[];
    /** Day and month they gave on the landing: pre-filled, still editable. */
    knownBirthDay?: { day: number; month: number };
}) {
    const router = useRouter();
    const create = useReadings().useCreate();
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<QuizAnswer[]>([]);
    const [birth, setBirth] = useState({
        day: knownBirthDay ? String(knownBirthDay.day) : "",
        month: knownBirthDay ? String(knownBirthDay.month) : "",
        year: "",
        time: "",
        place: "",
    });
    /** Compatibility: the other person's birth. */
    const [partner, setPartner] = useState({
        day: "",
        month: "",
        year: "",
        time: "",
    });
    /** Personality: the birthplace picked from the list. */
    const [place, setPlace] = useState<Place | null>(null);
    const yearRef = useRef<HTMLInputElement>(null);
    const [submitting, setSubmitting] = useState(false);
    /** Their chart, drawn while the hook is being written. */
    const [revealing, setRevealing] = useState<{
        chart: NatalChart;
        birthDate: string;
    } | null>(null);

    // Follow-ups join the list once the answer they follow is in.
    const asked = questionsFor(answers, questions);
    const total = quizLength(questions) + 1;
    const question = asked[step];
    const onBirthStep = !question;

    // When each question showed up: how long it took them is part of the answer.
    const shownAt = useRef(Date.now());
    const started = useRef(false);
    useEffect(() => {
        if (started.current) return;
        started.current = true;
        track("quiz_start", { topic, knownDay: Boolean(knownBirthDay) });
        metaCustomEvent("InicioCuestionario", { tema: topic });
    }, [topic, knownBirthDay]);

    // Only the year is missing: go straight to it.
    useEffect(() => {
        if (onBirthStep && knownBirthDay) yearRef.current?.focus();
    }, [onBirthStep, knownBirthDay]);

    function answer(given: QuizAnswer) {
        track("quiz_answer", {
            topic,
            question: given.questionId,
            answer:
                "optionId" in given ? given.optionId : given.ranking.join(">"),
            step: step + 1,
            ms: Date.now() - shownAt.current,
            changed: answers.some((a) => a.questionId === given.questionId),
        });
        shownAt.current = Date.now();
        const next = [
            ...answers.filter((a) => a.questionId !== question.id),
            given,
        ];
        // Back and changed: what only the old answer asked or offered
        // (its follow-up, an option that assumed it) goes with it.
        setAnswers(pruneAnswers(next, questions));
        setStep(step + 1);
    }

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        const birthDate = toBirthDate(birth);
        if ("error" in birthDate) {
            track("quiz_error", { message: birthDate.error });
            toast.error(birthDate.error);
            return;
        }
        let partnerBirth: CreateReading["partner"];
        if (topic === "compatibilidad") {
            const date = toBirthDate(partner);
            if ("error" in date) {
                const message = date.error.replace("tu fecha", "su fecha");
                track("quiz_error", { message });
                toast.error(message);
                return;
            }
            partnerBirth = {
                birthDate: date.date,
                birthTime: partner.time || undefined,
            };
        }
        const parsed = createReadingSchema.safeParse({
            topic,
            birthDate: birthDate.date,
            birthTime: birth.time || undefined,
            // Their birthplace's zone if they picked it; else the browser's.
            birthTimeZone:
                place?.timeZone ??
                Intl.DateTimeFormat().resolvedOptions().timeZone,
            birthPlace: place?.label ?? (birth.place.trim() || undefined),
            birthLatitude: place?.latitude,
            birthLongitude: place?.longitude,
            partner: partnerBirth,
            answers,
        });
        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            // The age rule speaks to them; said of the other person, it's theirs.
            const message =
                issue?.path[0] === "partner"
                    ? `Esa persona también debe tener al menos ${PRIVACY_COMMITMENTS.minimumAge} años`
                    : (issue?.message ?? "Revisa tus datos de nacimiento");
            track("quiz_error", { message });
            toast.error(message);
            return;
        }
        track("quiz_submit", {
            time: Boolean(birth.time),
            place: Boolean(place || birth.place.trim()),
            ...(partnerBirth && { partnerTime: Boolean(partner.time) }),
            ms: Date.now() - shownAt.current,
        });
        const chart = natalChart(
            parsed.data.birthDate,
            parsed.data.birthTime ?? null,
            parsed.data.birthTimeZone,
        );
        // Their Sun sign, for the ads (a sign isn't sensitive; answers are).
        const signo =
            chart.placements.find((p) => p.body === "Sol")?.sign ?? null;
        metaCustomEvent("FechaIngresada", { signo });
        setSubmitting(true);
        setRevealing({ chart, birthDate: parsed.data.birthDate });
        try {
            await ensureSession();
            // Eden only infers 200 bodies; the 201 envelope is parsed here.
            const { response } = z
                .object({ response: createdReadingSchema })
                .parse(await create.mutateAsync(parsed.data));
            // Quiz done and a reading started: what the ads are after.
            metaEvent(
                "CompleteRegistration",
                { content_name: topic, status: true, signo },
                `registro-${response.id}`,
            );
            metaEvent("Lead", { content_name: topic }, `lead-${response.id}`);
            router.push(`/lectura/r/${response.id}`);
        } catch {
            track("quiz_fail");
            toast.error(
                "No pudimos preparar tu lectura. Inténtalo de nuevo en un momento.",
            );
            setRevealing(null);
            setSubmitting(false);
        }
    }

    if (revealing)
        return (
            <ChartReveal
                chart={revealing.chart}
                birthDate={revealing.birthDate}
                mode="teaser"
                topic={topic}
            />
        );

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center gap-3">
                {step > 0 && !submitting && (
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Pregunta anterior"
                        onClick={() => {
                            track("quiz_back", {
                                from: question?.id ?? "nacimiento",
                                step: step + 1,
                            });
                            shownAt.current = Date.now();
                            setStep(step - 1);
                        }}
                    >
                        <ArrowLeft />
                    </Button>
                )}
                <div
                    className="h-1 flex-1 overflow-hidden rounded-full bg-astral-ink"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={step + 1}
                >
                    <div
                        className="h-full bg-astral-gold transition-[width] duration-500"
                        style={{ width: `${((step + 1) / total) * 100}%` }}
                    />
                </div>
                <span className="font-mono text-[11px] text-muted-foreground tracking-[0.16em]">
                    {step + 1}/{total}
                </span>
            </div>

            {question?.kind === "rank" ? (
                <RankQuestion
                    key={question.id}
                    question={question}
                    answers={answers}
                    ranking={rankingOf(answers, question.id)}
                    onRank={(ranking) =>
                        answer({ questionId: question.id, ranking })
                    }
                />
            ) : question ? (
                <fieldset className="flex flex-col gap-5">
                    <legend className="mb-5 text-pretty font-display text-3xl sm:text-4xl">
                        {questionFor(question, answers)}
                    </legend>
                    <div className="flex flex-col gap-3">
                        {optionsFor(question, answers).map((option) => {
                            const selected =
                                chosen(answers, question.id) === option.id;
                            return (
                                <Button
                                    key={option.id}
                                    variant="outline"
                                    aria-pressed={selected}
                                    className="h-auto justify-start whitespace-normal border-astral-ink bg-card/40 px-5 py-4 text-left text-base aria-pressed:border-astral-gold"
                                    onClick={() =>
                                        answer({
                                            questionId: question.id,
                                            optionId: option.id,
                                        })
                                    }
                                >
                                    {labelFor(option, answers)}
                                </Button>
                            );
                        })}
                    </div>
                </fieldset>
            ) : (
                <form onSubmit={submit} className="flex flex-col gap-6">
                    <div>
                        <h2 className="text-pretty font-display text-3xl sm:text-4xl">
                            {knownBirthDay &&
                            (topic === "amor" || topic === "camino")
                                ? "Solo falta el año"
                                : BIRTH_COPY[topic].title}
                        </h2>
                        <p className="mt-2 text-muted-foreground text-sm">
                            {knownBirthDay
                                ? BIRTH_COPY[topic].knownHelp
                                : BIRTH_COPY[topic].help}
                        </p>
                    </div>
                    <div className="flex flex-col gap-4">
                        {topic === "compatibilidad" && (
                            <h3 className="font-mono text-[11px] text-astral-gold uppercase tracking-[0.16em]">
                                Tú
                            </h3>
                        )}
                        <DateFields
                            id="birth"
                            legend="Fecha de nacimiento"
                            value={birth}
                            onChange={(date) => setBirth({ ...birth, ...date })}
                            yearRef={yearRef}
                        />
                        <div
                            className={
                                topic === "personalidad" ||
                                topic === "compatibilidad"
                                    ? "flex flex-col gap-4"
                                    : "grid gap-4 sm:grid-cols-2"
                            }
                        >
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="birth-time">
                                    {topic === "personalidad"
                                        ? "Hora"
                                        : "Hora (opcional)"}
                                </Label>
                                <Input
                                    id="birth-time"
                                    type="time"
                                    required={topic === "personalidad"}
                                    value={birth.time}
                                    onChange={(e) =>
                                        setBirth({
                                            ...birth,
                                            time: e.target.value,
                                        })
                                    }
                                />
                                {topic === "personalidad" && (
                                    <p className="text-muted-foreground text-xs">
                                        Está en tu partida de nacimiento. Si no
                                        la tienes, pregúntale a tu familia.
                                    </p>
                                )}
                            </div>
                            {topic === "personalidad" ? (
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="birth-place">
                                        Ciudad donde naciste
                                    </Label>
                                    <PlaceSearch
                                        id="birth-place"
                                        place={place}
                                        onPlace={setPlace}
                                    />
                                </div>
                            ) : (
                                topic !== "compatibilidad" && (
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="birth-place">
                                            Ciudad (opcional)
                                        </Label>
                                        <Input
                                            id="birth-place"
                                            maxLength={120}
                                            placeholder="Lima"
                                            value={birth.place}
                                            onChange={(e) =>
                                                setBirth({
                                                    ...birth,
                                                    place: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                    {topic === "compatibilidad" && (
                        <div className="flex flex-col gap-4">
                            <h3 className="font-mono text-[11px] text-astral-gold uppercase tracking-[0.16em]">
                                {THEM[chosen(answers, "vinculo") ?? ""] ??
                                    "Esa persona"}
                            </h3>
                            <DateFields
                                id="partner"
                                legend="Su fecha de nacimiento"
                                value={partner}
                                onChange={(date) =>
                                    setPartner({ ...partner, ...date })
                                }
                            />
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="partner-time">
                                    Su hora (opcional)
                                </Label>
                                <Input
                                    id="partner-time"
                                    type="time"
                                    value={partner.time}
                                    onChange={(e) =>
                                        setPartner({
                                            ...partner,
                                            time: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <p className="text-muted-foreground text-xs">
                                Su fecha se usa solo para esta lectura.
                            </p>
                        </div>
                    )}
                    <GoldButton
                        type="submit"
                        size="lg"
                        disabled={submitting}
                        className="rounded-full"
                    >
                        {submitting ? (
                            <>
                                <Spinner /> Leyendo tu carta…
                            </>
                        ) : (
                            "Ver mi lectura"
                        )}
                    </GoldButton>
                </form>
            )}
        </div>
    );
}
