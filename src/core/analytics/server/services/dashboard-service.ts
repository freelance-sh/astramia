import "server-only";
import { LOVE_QUIZ, optionLabel } from "@/core/reading/domain/quiz";
import { QUIZZES } from "@/core/reading/domain/quizzes";
import * as query from "../repository/dashboard";

/** The panel's time ranges, in days; "todo" is since the first event. */
export const RANGES = { "7": 7, "30": 30, "90": 90, todo: null } as const;
export type RangeKey = keyof typeof RANGES;

export const rangeOf = (value?: string): RangeKey =>
    value && value in RANGES ? (value as RangeKey) : "30";

const DAY_MS = 24 * 60 * 60 * 1000;

const share = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

const LATENCY_LABELS: Record<string, string> = {
    reading_created: "Lectura gratis",
    content_written: "Lectura completa",
    chat_reply: "Respuesta del Sol",
};

const TOPIC_LABELS: Record<string, string> = {
    compatibilidad: "Compatibilidad",
    personalidad: "Personalidad",
    camino: "Camino",
};

/**
 * Every questionnaire's questions, each once (they share only the first),
 * the ones past love named with their reading.
 */
const ALL_QUESTIONS = Object.entries(QUIZZES)
    .flatMap(([topic, quiz]) =>
        quiz.map((q) => ({
            ...q,
            question: TOPIC_LABELS[topic]
                ? `${TOPIC_LABELS[topic]} · ${q.question}`
                : q.question,
        })),
    )
    .filter((q, i, all) => all.findIndex((o) => o.id === q.id) === i);

/** Each love quiz step as the reader meets it; the third is the follow-up. */
function quizStepLabels(): string[] {
    const main = LOVE_QUIZ.filter((q) => !q.after).map((q) => q.question);
    return [...main.slice(0, 2), "Pregunta de seguimiento", ...main.slice(2)];
}

/** Everything the panel shows for a range, shaped for reading at a glance. */
export async function dashboardService(range: RangeKey) {
    const days = RANGES[range];
    const since =
        days === null ? new Date(0) : new Date(Date.now() - days * DAY_MS);
    const [
        overview,
        funnel,
        timeFree,
        timePaid,
        chat,
        latencies,
        daily,
        choices,
        ranks,
        steps,
        reach,
        returning,
        sources,
        campaigns,
        devices,
        clicks,
        errors,
        costs,
    ] = await Promise.all([
        query.overview(since),
        query.readingFunnel(since),
        query.readingTime(since, "free"),
        query.readingTime(since, "paid"),
        query.chatStats(since),
        query.latencies(since),
        query.daily(Math.min(days ?? 90, 90)),
        query.choiceCounts(since),
        query.rankCounts(since),
        query.quizSteps(since),
        query.storyReach(since),
        query.returning(since),
        query.sources(since),
        query.campaigns(since),
        query.devices(since),
        query.topValues(since, "click", "label", 15),
        query.topValues(since, "client_error", "message", 8),
        query.costs(since),
    ]);

    // Choice questions: each option's share of that question's answers.
    const questions = ALL_QUESTIONS.filter(
        (q) => (q.kind ?? "choice") === "choice",
    )
        .map((q) => {
            const counts = choices.filter((c) => c.question === q.id);
            const total = counts.reduce((n, c) => n + c.count, 0);
            return {
                id: q.id,
                question: q.question,
                total,
                // Retired options only while some reading still has them.
                options: q.options
                    .filter(
                        (o) =>
                            !o.retired || counts.some((c) => c.option === o.id),
                    )
                    .map((o) => {
                        const count =
                            counts.find((c) => c.option === o.id)?.count ?? 0;
                        return {
                            label: optionLabel(o.label, "neutro"),
                            count,
                            share: share(count, total),
                        };
                    })
                    .sort((a, b) => b.count - a.count),
            };
        })
        .filter((q) => q.total > 0);

    // Rankings: how often each option came first, and its average place.
    const rankings = ALL_QUESTIONS.filter((q) => q.kind === "rank").map((q) => {
        const counts = ranks.filter((r) => r.question === q.id);
        const total = counts
            .filter((r) => r.place === 1)
            .reduce((n, r) => n + r.count, 0);
        return {
            id: q.id,
            question: q.question,
            total,
            options: q.options
                .filter(
                    (o) => !o.retired || counts.some((r) => r.option === o.id),
                )
                .map((o) => {
                    const mine = counts.filter((r) => r.option === o.id);
                    const answers = mine.reduce((n, r) => n + r.count, 0);
                    const first = mine.find((r) => r.place === 1)?.count ?? 0;
                    return {
                        label: optionLabel(o.label, "neutro"),
                        first,
                        firstShare: share(first, total),
                        averagePlace:
                            answers > 0
                                ? mine.reduce(
                                      (n, r) => n + r.place * r.count,
                                      0,
                                  ) / answers
                                : null,
                    };
                })
                .sort((a, b) => (a.averagePlace ?? 9) - (b.averagePlace ?? 9)),
        };
    });

    // How far they read: the share of readings that got past each tenth.
    const reachOf = (paid: boolean) => {
        const mine = reach.filter((r) => r.paid === paid);
        const total = mine.reduce((n, r) => n + r.readings, 0);
        return {
            total,
            tenths: Array.from({ length: 10 }, (_, i) => {
                const readings = mine
                    .filter((r) => r.tenth >= i + 1)
                    .reduce((n, r) => n + r.readings, 0);
                return {
                    label: `${(i + 1) * 10}%`,
                    readings,
                    share: share(readings, total),
                };
            }),
        };
    };

    const labels = quizStepLabels();
    return {
        range,
        overview,
        funnel,
        time: { free: timeFree, paid: timePaid },
        chat,
        latencies: ["reading_created", "content_written", "chat_reply"].map(
            (name) => ({
                label: LATENCY_LABELS[name],
                ...(latencies.find((l) => l.name === name) ?? {
                    count: 0,
                    p50: null,
                    p90: null,
                }),
            }),
        ),
        daily,
        questions,
        rankings,
        quizSteps: [
            { label: "Empezaron", visitors: overview.quizStarters },
            ...labels.map((label, i) => ({
                label,
                visitors: steps.find((s) => s.step === i + 1)?.visitors ?? 0,
            })),
            { label: "Dieron su fecha", visitors: overview.quizFinishers },
        ],
        reach: { free: reachOf(false), paid: reachOf(true) },
        returning,
        sources,
        campaigns,
        devices,
        clicks,
        errors,
        costs,
    };
}

export type Dashboard = Awaited<ReturnType<typeof dashboardService>>;
