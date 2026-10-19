import { z } from "zod";
import type { MoonPhaseName } from "@/core/landing/domain/ephemeris";
import type { Element } from "@/core/landing/domain/zodiac";
import { PRIVACY_COMMITMENTS } from "@/core/legal/domain/policies";
import { isTimeZone } from "./chart";
import type { ReadingFacts } from "./facts";
import { isCompleteQuiz, quizLength } from "./quiz";
import { QUIZZES } from "./quizzes";

export const readingTopicSchema = z.enum([
    "amor",
    "compatibilidad",
    "personalidad",
    "camino",
]);

/** How long the chat stays open and how much it can be used. */
export const CHAT_LIMITS = {
    hours: 2,
    /** "Límites razonables": caps model spend per purchase. */
    maxUserMessages: 40,
    maxMessageChars: 800,
} as const;

/** Readings an account may start per day; each one costs a teaser call. */
export const DAILY_READING_LIMIT = 5;

function yearsBetween(from: Date, to: Date): number {
    let years = to.getUTCFullYear() - from.getUTCFullYear();
    const beforeBirthday =
        to.getUTCMonth() < from.getUTCMonth() ||
        (to.getUTCMonth() === from.getUTCMonth() &&
            to.getUTCDate() < from.getUTCDate());
    if (beforeBirthday) years--;
    return years;
}

export const birthDateSchema = z.iso.date().refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
        date.getUTCFullYear() >= 1900 &&
        yearsBetween(date, new Date()) >= PRIVACY_COMMITMENTS.minimumAge
    );
}, `Debes tener al menos ${PRIVACY_COMMITMENTS.minimumAge} años`);

/** Day and month the visitor gave on the landing (`?dia=&mes=`). */
export const knownBirthDaySchema = z
    .object({
        dia: z.coerce.number().int().min(1).max(31),
        mes: z.coerce.number().int().min(1).max(12),
    })
    // 2000 is a leap year: 29 February is a valid birthday.
    .refine(
        ({ dia, mes }) => dia <= new Date(Date.UTC(2000, mes, 0)).getUTCDate(),
    )
    .transform(({ dia, mes }) => ({ day: dia, month: mes }));

/** One option picked, or (for a "rank" question) all of them in order. */
export const quizAnswerSchema = z.union([
    z.object({ questionId: z.string(), optionId: z.string() }),
    z.object({
        questionId: z.string(),
        ranking: z.array(z.string()).min(2).max(12),
    }),
]);

const timeSchema = z.iso.time({ precision: -1 });

/** The other person, in a compatibility reading: their birth, as known. */
export const partnerSchema = z.object({
    birthDate: birthDateSchema,
    birthTime: timeSchema.optional(),
});

export const createReadingSchema = z
    .object({
        topic: readingTopicSchema,
        birthDate: birthDateSchema,
        birthTime: timeSchema.optional(),
        /**
         * The birthplace's zone when they picked it from the list; else the
         * browser's (most people answer from the country they were born in).
         */
        birthTimeZone: z.string().max(64).refine(isTimeZone).optional(),
        birthPlace: z.string().trim().min(2).max(120).optional(),
        /** The birthplace picked from the list: what the Ascendant needs. */
        birthLatitude: z.number().min(-90).max(90).optional(),
        birthLongitude: z.number().min(-180).max(180).optional(),
        partner: partnerSchema.optional(),
        answers: z
            .array(quizAnswerSchema)
            .max(Math.max(...Object.values(QUIZZES).map((q) => quizLength(q)))),
    })
    .superRefine((input, ctx) => {
        const issue = (path: string, message: string) =>
            ctx.addIssue({ code: "custom", path: [path], message });
        if (!isCompleteQuiz(input.answers, QUIZZES[input.topic]))
            issue("answers", "Respuestas inválidas");
        if (input.topic === "compatibilidad" && !input.partner)
            issue("partner", "Falta la fecha de nacimiento de esa persona");
        if (input.topic === "personalidad") {
            if (!input.birthTime)
                issue(
                    "birthTime",
                    "Para tu Ascendente necesitamos tu hora de nacimiento",
                );
            if (
                input.birthLatitude === undefined ||
                input.birthLongitude === undefined ||
                !input.birthPlace ||
                !input.birthTimeZone
            )
                issue(
                    "birthPlace",
                    "Elige tu ciudad de nacimiento de la lista",
                );
        }
    });

/*
 * Computed by `chart.ts` and handed to the prompts so the model interprets
 * facts instead of inventing them. Never parsed from input; the element type
 * stays defined once, in the zodiac.
 */

export const natalPlacementSchema = z.object({
    body: z.string(),
    sign: z.string(),
    degree: z.string(),
    element: z.custom<Element>(),
    longitude: z.number(),
});

export const aspectNameSchema = z.enum([
    "conjunción",
    "sextil",
    "cuadratura",
    "trígono",
    "oposición",
]);

export const aspectSchema = z.object({
    a: z.string(),
    b: z.string(),
    name: aspectNameSchema,
    /** Degrees away from exact. */
    orb: z.number(),
});

const orbitPointSchema = z.object({ x: z.number(), y: z.number() });

export const natalChartSchema = z.object({
    placements: z.array(natalPlacementSchema),
    aspects: z.array(aspectSchema),
    dominantElement: z.custom<Element>().nullable(),
    moonPhase: z.custom<MoonPhaseName>(),
    /**
     * Without a birth time the Moon (≈13°/day) may change sign that day:
     * the sign at midnight and at the end of the day. `null` when certain.
     */
    moonRange: z.object({ early: z.string(), late: z.string() }).nullable(),
    /**
     * Venus, the Earth and Mars around the Sun at birth (AU, ecliptic
     * plane), to draw the solar system of that day.
     */
    orbits: z.object({
        Venus: orbitPointSchema,
        Tierra: orbitPointSchema,
        Marte: orbitPointSchema,
    }),
});

export const skyEventSchema = z.object({
    /** "finales de octubre": dates are ±1 day, so no false precision. */
    when: z.string(),
    /** The sentence <cielo> gives the model. */
    text: z.string(),
    kind: z.enum(["entra", "retrograda", "directa"]),
    sign: z.string(),
    /** 0–11, for drawing the months ahead. */
    month: z.number(),
    /** Days after the reading's day, and that day (YYYY-MM-DD, UTC): to draw Venus there. */
    day: z.number().int(),
    date: z.string(),
    /** The person's placements in that sign. */
    mine: z.array(z.enum(["Sol", "Venus", "Luna"])),
});

export const venusOutlookSchema = z.object({
    sign: z.string(),
    retrograde: z.boolean(),
    events: z.array(skyEventSchema),
});

/**
 * Wire shape. `content` is `null` until the reading is unlocked *and*
 * written; the locked reading never carries it.
 */
export const readingSchema = z.object({
    id: z.string(),
    topic: readingTopicSchema,
    sunSign: z.string(),
    teaser: z.string(),
    birthDate: z.string(),
    /** HH:mm, when they knew it: the story says what its sky was computed for. */
    birthTime: z.string().nullable(),
    birthPlace: z.string().nullable(),
    /** Drawn while the full text is being written. */
    chart: natalChartSchema,
    locked: z.boolean(),
    content: z.string().nullable(),
    /** What they wanted to know first, as a question; the story's chapter III. */
    question: z.string().nullable(),
    /** Venus after the reading was written (what its text talks about); empty while locked. */
    skyAhead: z.array(skyEventSchema),
    /** The readings past love: the extra sky their scenes draw (`facts.ts`). */
    facts: z.custom<ReadingFacts>().nullable(),
    chatExpiresAt: z.string().nullable(),
    createdAt: z.string(),
});

/** A row of "Mis lecturas": no texts. */
export const readingSummarySchema = z.object({
    id: z.string(),
    sunSign: z.string(),
    unlocked: z.boolean(),
    createdAt: z.string(),
});

export const readingIdParamsSchema = z.object({ id: z.string().min(1) });

export const chatRoleSchema = z.enum(["user", "assistant"]);

export const chatMessageSchema = z.object({
    id: z.string(),
    role: chatRoleSchema,
    content: z.string(),
    createdAt: z.string(),
});

export const chatTurnSchema = z.object({
    text: z.string().trim().min(1).max(CHAT_LIMITS.maxMessageChars),
});

export const createdReadingSchema = z.object({ id: z.string() });

/** A birthplace to pick from the list: what the Ascendant needs. */
export const placeSchema = z.object({
    /** "Arequipa, Perú". */
    label: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    /** Its IANA zone: the birth time is read in it. */
    timeZone: z.string(),
});

export const placeSearchSchema = z.object({
    q: z.string().trim().min(2).max(80),
});

/** What the prompts know about the person (a reading row minus bookkeeping). */
export const readingProfileSchema = z.object({
    /** Which reading they asked for; the love one when absent. */
    topic: readingTopicSchema.optional(),
    birthDate: z.string(),
    birthTime: z.string().nullable(),
    /** IANA zone of `birthTime`; `null` → the chart's default (Lima). */
    birthTimeZone: z.string().nullable(),
    birthPlace: z.string().nullable(),
    birthLatitude: z.number().nullable().optional(),
    birthLongitude: z.number().nullable().optional(),
    /** The other person, in a compatibility reading. */
    partner: z
        .object({ birthDate: z.string(), birthTime: z.string().nullable() })
        .nullable()
        .optional(),
    answers: z.array(quizAnswerSchema),
});

/** The reading's Markdown subset, parsed into blocks for rendering. */
export const readingBlockSchema = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("heading"), text: z.string() }),
    z.object({ kind: z.literal("paragraph"), text: z.string() }),
]);
