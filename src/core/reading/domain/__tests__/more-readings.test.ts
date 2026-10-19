import { describe, expect, it } from "vitest";
import { natalChart } from "../chart";
import { cluesFor } from "../clues";
import { readingFacts } from "../facts";
import { sceneMoments } from "../plan";
import { PLANS } from "../plans";
import { describeProfile, describeSky } from "../prompts";
import {
    isCompleteQuiz,
    labelFor,
    optionsFor,
    type QuizQuestion,
    questionFor,
    questionsFor,
} from "../quiz";
import { FIRST_QUESTION, QUIZZES } from "../quizzes";
import { createReadingSchema } from "../schemas";
import {
    buildStory,
    paidSkies,
    previewStory,
    type StoryInput,
    storyQuestion,
} from "../story";
import type { QuizAnswer, ReadingProfile, ReadingTopic } from "../types";

const TOPICS = ["compatibilidad", "personalidad", "camino"] as const;

/** Every way through a questionnaire: each option of each question it asks. */
function everyPath(quiz: readonly QuizQuestion[]): QuizAnswer[][] {
    const walk = (path: QuizAnswer[]): QuizAnswer[][] => {
        const next = questionsFor(path, quiz).find(
            (q) => !path.some((a) => a.questionId === q.id),
        );
        if (!next) return [path];
        return optionsFor(next, path).flatMap((o) =>
            walk([...path, { questionId: next.id, optionId: o.id }]),
        );
    };
    return walk([]);
}

/** What each question looked like when it was asked, along a path. */
function asked(path: QuizAnswer[], quiz: readonly QuizQuestion[]) {
    return path.map((a, i) => {
        const before = path.slice(0, i);
        const q = quiz.find((q) => q.id === a.questionId) as QuizQuestion;
        return {
            id: q.id,
            question: questionFor(q, before),
            options: optionsFor(q, before).map((o) => ({
                id: o.id,
                label: labelFor(o, before),
            })),
        };
    });
}

const answer = (path: QuizAnswer[], id: string) =>
    path.find(
        (a): a is { questionId: string; optionId: string } =>
            a.questionId === id && "optionId" in a,
    )?.optionId;

describe.each(TOPICS)("the %s questionnaire", (topic) => {
    const quiz = QUIZZES[topic];
    const paths = everyPath(quiz);

    it("ends complete on every path, with a choice at every step", () => {
        expect(paths.length).toBeGreaterThan(100);
        for (const path of paths) {
            expect(isCompleteQuiz(path, quiz), JSON.stringify(path)).toBe(true);
            for (const q of asked(path, quiz))
                expect(q.options.length, q.id).toBeGreaterThanOrEqual(3);
        }
    });

    it("says every first question back as theirs", () => {
        for (const path of paths)
            expect(
                storyQuestion(path, topic),
                answer(path, FIRST_QUESTION[topic]),
            ).not.toBeNull();
    });

    it("knows what usually comes with every answer but the first question", () => {
        for (const q of quiz)
            if (q.id !== "trato" && q.id !== FIRST_QUESTION[topic])
                for (const o of q.options)
                    expect(
                        cluesFor([{ questionId: q.id, optionId: o.id }]),
                        `${q.id}.${o.id}`,
                    ).not.toHaveLength(0);
    });
});

describe("the compatibility questionnaire's paths", () => {
    const paths = everyPath(QUIZZES.compatibilidad);

    it("asks about an ex in the past", () => {
        for (const path of paths.filter((p) => answer(p, "vinculo") === "ex")) {
            const shown = asked(path, QUIZZES.compatibilidad);
            const text = shown
                .filter((q) => q.id !== "trato" && q.id !== "vinculo")
                .flatMap((q) => [q.question, ...q.options.map((o) => o.label)])
                .join(" | ");
            expect(text).not.toMatch(
                /\bchocan\b|\bsale solo\b|chocamos|necesita esa/,
            );
        }
    });

    it("never asks whoever just likes someone why they clash", () => {
        for (const path of paths.filter(
            (p) => answer(p, "vinculo") === "gusta",
        )) {
            const ids = asked(path, QUIZZES.compatibilidad)
                .find((q) => q.id === "c_pregunta")
                ?.options.map((o) => o.id);
            expect(ids).not.toContain("chocamos");
            expect(ids).not.toContain("no_funciono");
        }
    });

    it("offers «why we clash» only to whoever said where they clash", () => {
        for (const path of paths) {
            const ids = asked(path, QUIZZES.compatibilidad)
                .find((q) => q.id === "c_pregunta")
                ?.options.map((o) => o.id);
            if (ids?.includes("chocamos"))
                expect(["casi_no", "aun_no"]).not.toContain(
                    answer(path, "choca"),
                );
        }
    });
});

const first = (topic: ReadingTopic) => everyPath(QUIZZES[topic])[0];

describe("a reading past love's data", () => {
    const base = {
        birthDate: "1995-08-10",
        birthTime: "14:30",
        birthTimeZone: "America/Lima",
    };

    it("asks compatibility for the other person's birth", () => {
        const input = {
            topic: "compatibilidad",
            ...base,
            answers: first("compatibilidad"),
        };
        expect(createReadingSchema.safeParse(input).success).toBe(false);
        expect(
            createReadingSchema.safeParse({
                ...input,
                partner: { birthDate: "1993-11-02" },
            }).success,
        ).toBe(true);
    });

    it("asks personality for the hour and a birthplace from the list", () => {
        const input = {
            topic: "personalidad",
            ...base,
            answers: first("personalidad"),
        };
        expect(createReadingSchema.safeParse(input).success).toBe(false);
        const placed = {
            ...input,
            birthPlace: "Lima, Lima, Perú",
            birthLatitude: -12.0464,
            birthLongitude: -77.0428,
        };
        expect(createReadingSchema.safeParse(placed).success).toBe(true);
        expect(
            createReadingSchema.safeParse({ ...placed, birthTime: undefined })
                .success,
        ).toBe(false);
    });

    it("takes the path reading with the date alone", () => {
        expect(
            createReadingSchema.safeParse({
                topic: "camino",
                birthDate: "1997-11-14",
                answers: first("camino"),
            }).success,
        ).toBe(true);
    });

    it("never takes another reading's answers", () => {
        expect(
            createReadingSchema.safeParse({
                topic: "camino",
                birthDate: "1997-11-14",
                answers: first("personalidad"),
            }).success,
        ).toBe(false);
    });
});

/** A fixed "today": the slow planets' year depends on it. */
const TODAY = new Date("2026-10-19T12:00:00Z");

const PROFILES: Record<(typeof TOPICS)[number], ReadingProfile> = {
    compatibilidad: {
        topic: "compatibilidad",
        birthDate: "1995-08-10",
        birthTime: "14:30",
        birthTimeZone: "America/Lima",
        birthPlace: null,
        partner: { birthDate: "1993-11-02", birthTime: null },
        answers: first("compatibilidad"),
    },
    personalidad: {
        topic: "personalidad",
        birthDate: "1990-06-15",
        birthTime: "08:20",
        birthTimeZone: "America/Lima",
        birthPlace: "Lima, Lima, Perú",
        birthLatitude: -12.0464,
        birthLongitude: -77.0428,
        answers: first("personalidad"),
    },
    camino: {
        topic: "camino",
        birthDate: "1997-11-14",
        birthTime: null,
        birthTimeZone: null,
        birthPlace: null,
        answers: first("camino"),
    },
};

/** Every scene written, as the model would: a line each, moments by number. */
function texts(topic: (typeof TOPICS)[number]) {
    const plan = PLANS[topic];
    const line = (key: string) => `Texto de ${key}. Sigue un poco más.`;
    const teaser = Object.fromEntries(
        [...plan.free, plan.hook].map((s) => [s.key, line(s.key)]),
    );
    const content = Object.fromEntries([
        ...plan.paid.map((s) =>
            s.kind === "moments"
                ? [
                      s.key,
                      [
                          { event: 1, text: "A principios de mes, algo." },
                          { event: 2, text: "Más adelante, otra cosa." },
                      ],
                  ]
                : [s.key, line(s.key)],
        ),
        ["closing", "Una frase para guardar."],
    ]);
    return { teaser: JSON.stringify(teaser), content: JSON.stringify(content) };
}

function storyInput(topic: (typeof TOPICS)[number]): StoryInput {
    const profile = PROFILES[topic];
    return {
        topic,
        ...texts(topic),
        chart: natalChart(
            profile.birthDate,
            profile.birthTime,
            profile.birthTimeZone,
        ),
        question: storyQuestion(profile.answers, topic),
        skyAhead: [],
        facts: readingFacts(topic, profile, TODAY),
    };
}

describe("compatibility, told", () => {
    const facts = readingFacts(
        "compatibilidad",
        PROFILES.compatibilidad,
        TODAY,
    );

    it("crosses both charts, without the Moon whose hour is unknown", () => {
        expect(facts?.partner?.sunSign).toBe("Escorpio");
        expect(facts?.partner?.bodies.map((p) => p.body)).not.toContain("Luna");
        expect(facts?.contacts.length).toBeGreaterThan(0);
        const prompt = describeProfile(PROFILES.compatibilidad, TODAY);
        expect(prompt).toContain("<su-carta>");
        expect(prompt).toContain("<entre-ustedes>");
    });

    it("shows both charts, lighting each scene's contact", () => {
        const story = buildStory(storyInput("compatibilidad"));
        const kinds = new Set(story.steps.map((s) => s.visual.kind));
        expect(kinds).toContain("synastry");
        const preview = previewStory(storyInput("compatibilidad"));
        const door = preview.steps.at(-1);
        expect(door?.kind).toBe("door");
        expect(door?.visual).toMatchObject({
            kind: "synastry",
            focus: ["Venus", "Marte"],
        });
    });
});

describe("personality, told", () => {
    const facts = readingFacts("personalidad", PROFILES.personalidad, TODAY);

    it("finds the sign rising where and when they were born", () => {
        // Lima, 15 June 1990, 08:20: Cancer rises.
        expect(facts?.rising?.sign).toBe("Cáncer");
        const prompt = describeProfile(PROFILES.personalidad, TODAY);
        expect(prompt).toMatch(/Ascendente en Cáncer/);
        expect(prompt).toContain("Elemento");
    });

    it("leaves the free part on the horizon", () => {
        const preview = previewStory(storyInput("personalidad"));
        expect(preview.steps.at(-1)?.visual).toMatchObject({
            kind: "rising",
            sign: "Cáncer",
        });
        const skies = paidSkies(storyInput("personalidad"));
        expect(skies.map((s) => s.body)).toContain("Ascendente");
    });
});

describe("the path, told", () => {
    const facts = readingFacts("camino", PROFILES.camino, TODAY);

    it("hands the model the year's dates, numbered", () => {
        expect(facts?.path.length).toBeGreaterThan(2);
        expect(facts?.age).toBe(28);
        const sky = describeSky(PROFILES.camino, TODAY);
        expect(sky).toMatch(/\n1\. .+\n2\. /);
        expect(describeProfile(PROFILES.camino, TODAY)).toContain("<ahora>");
    });

    it("pins each moment to its date on the year's line", () => {
        const input = storyInput("camino");
        const story = buildStory(input);
        const moments = story.steps.filter((s) => s.visual.kind === "path");
        expect(moments).toHaveLength(
            sceneMoments(JSON.parse(input.content)).length,
        );
        expect(moments.map((s) => s.visual)).toMatchObject([
            { focus: 0 },
            { focus: 1 },
        ]);
    });
});
