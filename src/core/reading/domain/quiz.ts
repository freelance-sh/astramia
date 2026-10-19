import type { QuizAnswer } from "./types";

export type Trato = "femenino" | "masculino" | "neutro";

/** One text, or one per trato when it describes the reader. */
export type QuizLabel = string | Readonly<Record<Trato, string>>;

/** An earlier answer, as a follow-up's condition. */
interface AnsweredWith {
    questionId: string;
    optionId: string;
}

/**
 * Earlier answers something depends on: for each question named, one of
 * its listed options. Plain data, so a quiz crosses from server to client.
 */
export type When = Readonly<Record<string, readonly string[]>>;

export interface QuizOption {
    id: string;
    label: QuizLabel;
    /**
     * Offered only after one of these sets of answers; to everyone without
     * it. An option that assumes a past (a relationship, an ex) is offered
     * only to whoever said they had one.
     */
    showIf?: readonly When[];
    /** Its label after these answers ("Mi relación" for whoever is in one). */
    relabel?: readonly { when: When; label: QuizLabel }[];
    /** No longer offered; still described for the readings that chose it. */
    retired?: true;
}

export interface QuizQuestion {
    id: string;
    question: string;
    /**
     * "choice" (the default) is one tap. "rank" puts every option in order,
     * most important first: few options, so it fits a phone without a
     * scroll, and what comes last tells the reading what isn't at stake.
     */
    kind?: "choice" | "rank";
    /** A line under the question, for one that isn't a single tap. */
    hint?: string;
    options: readonly QuizOption[];
    /** Its wording after these answers, where the default would assume. */
    reword?: readonly { when: When; question: string }[];
    /** A follow-up: asked only right after this answer. */
    after?: AnsweredWith;
}

/** Whoever said they've been in a relationship (now, past, or unclear). */
const HAD_ONE: readonly When[] = [
    { situacion: ["relacion", "ruptura", "complicado"] },
    {
        situacion: ["soltera"],
        ultimo_amor: ["hace_poco", "mas_de_un_ano", "anos"],
    },
];
/** Single and never really in love. */
const NEVER: When = { situacion: ["soltera"], ultimo_amor: ["nunca"] };

/** A follow-up on "where's your heart": what that answer leaves open. */
const followUp = (
    optionId: string,
    question: Omit<QuizQuestion, "after">,
): QuizQuestion => ({
    ...question,
    after: { questionId: "situacion", optionId },
});

/**
 * The love-reading questionnaire. Fixed options keep it one-tap on a phone
 * and give the model clean signals. `OFFER.questions` counts what each
 * reader is asked.
 *
 * `trato` comes first: Spanish needs a grammatical gender, and without it
 * the model defaults to one and gets it wrong for many readers. Options that
 * describe the reader come in each trato, so the rest of the quiz already
 * speaks to them the way they asked.
 *
 * What a reader tells about themselves is the reading's real signal, so
 * the quiz asks for facts and behaviours over wishes: one follow-up pins
 * down where their heart is, and "what do you do when they're slow to
 * answer" replaced "what do you need most", whose options all sounded
 * equally good and told little.
 *
 * Nothing may assume what they didn't say: whoever has nobody in mind is
 * never asked about "that person", whoever never fell in love isn't
 * offered what a relationship did to them, whoever is happy together
 * isn't asked whether to leave. Wording (`reword`), labels (`relabel`)
 * and which options appear (`showIf`) follow the earlier answers, and the
 * tests walk every path through the quiz to keep it that way.
 */
export const LOVE_QUIZ: readonly QuizQuestion[] = [
    {
        id: "trato",
        question: "Para empezar, ¿cómo quieres que te hable?",
        options: [
            { id: "femenino", label: "En femenino" },
            { id: "masculino", label: "En masculino" },
            { id: "neutro", label: "Sin género" },
        ],
    },
    {
        id: "situacion",
        question: "¿Dónde está tu corazón ahora mismo?",
        options: [
            {
                id: "soltera",
                label: {
                    femenino: "Sola, y sin nadie en mente",
                    masculino: "Solo, y sin nadie en mente",
                    neutro: "Sin pareja y sin nadie en mente",
                },
            },
            { id: "alguien", label: "Hay alguien que me gusta" },
            { id: "relacion", label: "En una relación" },
            { id: "ruptura", label: "Saliendo de una ruptura" },
            { id: "complicado", label: "Es complicado" },
        ],
    },
    followUp("soltera", {
        id: "ultimo_amor",
        question: "¿Cuándo fue la última vez que te enamoraste?",
        options: [
            { id: "hace_poco", label: "Hace poco" },
            { id: "mas_de_un_ano", label: "Hace más de un año" },
            { id: "anos", label: "Hace años" },
            { id: "nunca", label: "Creo que nunca de verdad" },
        ],
    }),
    followUp("alguien", {
        id: "sabe",
        question: "¿Esa persona sabe que te gusta?",
        options: [
            { id: "mutuo", label: "Sí, y creo que también le gusto" },
            { id: "no_se_que_siente", label: "Sí, pero no sé qué siente" },
            { id: "sospecha", label: "Creo que lo sospecha" },
            { id: "no_sabe", label: "No, no lo sabe" },
        ],
    }),
    followUp("relacion", {
        id: "como_estan",
        question: "¿Cómo están hoy?",
        options: [
            { id: "muy_bien", label: "Muy bien, y quiero cuidarlo" },
            { id: "algo_falta", label: "Bien, pero algo falta" },
            { id: "rutina", label: "En piloto automático" },
            { id: "peleas", label: "Peleamos seguido" },
            { id: "caminos", label: "Queremos cosas distintas para el futuro" },
            { id: "dudas", label: "Con dudas de seguir" },
        ],
    }),
    followUp("ruptura", {
        id: "termino",
        question: "¿Cuándo terminó?",
        options: [
            { id: "reciente_hablan", label: "Hace poco, y seguimos hablando" },
            { id: "reciente_sin", label: "Hace poco, y ya no hablamos" },
            { id: "meses", label: "Hace meses, y todavía pienso en eso" },
            { id: "mas_de_un_ano", label: "Hace más de un año" },
        ],
    }),
    followUp("complicado", {
        id: "complica",
        question: "¿Qué lo hace complicado?",
        options: [
            { id: "sin_nombre", label: "No sabemos qué somos" },
            { id: "otra_persona", label: "Hay otra persona" },
            { id: "idas_y_vueltas", label: "Volvemos y terminamos" },
            { id: "distancia", label: "La distancia" },
            { id: "entorno", label: "La familia o los amigos" },
        ],
    }),
    {
        id: "patron",
        // Not "in your relationships": some have never had one.
        question: "En el amor, ¿qué se repite contigo?",
        options: [
            {
                id: "indisponibles",
                label: "Me fijo en quien no está disponible",
            },
            { id: "doy_demasiado", label: "Doy más de lo que recibo" },
            { id: "me_alejo", label: "Me alejo cuando se pone serio" },
            { id: "celos", label: "Me cuesta confiar" },
            { id: "no_se", label: "No lo tengo claro" },
        ],
    },
    {
        id: "espera",
        // In general by default: some have nobody in mind, or never talk
        // to the one they like; "that person" only where they're in touch.
        question: "Cuando alguien te gusta y tarda en responder, tú…",
        reword: [
            {
                when: { situacion: ["relacion"] },
                question: "Cuando tu pareja tarda en responder, tú…",
            },
            {
                when: {
                    situacion: ["alguien"],
                    sabe: ["mutuo", "no_se_que_siente", "sospecha"],
                },
                question: "Cuando esa persona tarda en responder, tú…",
            },
            {
                // Not with a third one in the story: "that person" is unclear.
                when: {
                    situacion: ["complicado"],
                    complica: [
                        "sin_nombre",
                        "idas_y_vueltas",
                        "distancia",
                        "entorno",
                    ],
                },
                question: "Cuando esa persona tarda en responder, tú…",
            },
        ],
        options: [
            { id: "reviso", label: "Reviso si se conectó" },
            { id: "escribo", label: "Le escribo otra vez" },
            { id: "como_si_nada", label: "Hago como si nada" },
            { id: "que_hice", label: "Pienso qué hice mal" },
            { id: "sigo", label: "Sigo en lo mío" },
        ],
    },
    {
        id: "herida",
        question: "¿Qué es lo que más te ha dolido en el amor?",
        // What a relationship can do only to whoever had one; the hurts of
        // wanting without it happening, to who hasn't (or has someone in
        // mind, maybe for the first time).
        options: [
            {
                id: "abandono",
                label: "Que se fueran sin explicación",
                relabel: [
                    {
                        when: NEVER,
                        label: "Que dejaran de hablarme sin explicación",
                    },
                ],
            },
            { id: "engano", label: "Un engaño" },
            { id: "indiferencia", label: "La indiferencia" },
            {
                id: "control",
                label: {
                    femenino: "Sentirme controlada",
                    masculino: "Sentirme controlado",
                    neutro: "Que intentaran controlarme",
                },
                showIf: HAD_ONE,
            },
            {
                id: "perder_me",
                label: "Perderme a mí en la relación",
                showIf: HAD_ONE,
            },
            {
                id: "no_correspondido",
                label: "Querer a alguien que no me quería igual",
                showIf: [{ situacion: ["soltera", "alguien"] }],
            },
            {
                id: "ilusion",
                label: "Ilusionarme y que no pasara nada",
                showIf: [{ situacion: ["alguien"] }, NEVER],
            },
            {
                id: "nada",
                label: "Todavía nada me ha dolido de verdad",
                showIf: [NEVER],
            },
        ],
    },
    {
        // What competes with love, in their own order: it tells the reading
        // which meaning their other answers likely have (losing themselves
        // to a relationship is about friends only for whom friends weigh).
        id: "prioridades",
        kind: "rank",
        question: "¿Qué es lo más importante en tu vida hoy?",
        hint: "Tócalas en orden, de lo que más pesa a lo que menos.",
        options: [
            {
                id: "amor",
                label: "Amor",
                relabel: [
                    { when: { situacion: ["relacion"] }, label: "Mi relación" },
                ],
            },
            { id: "gente", label: "Familia y amigos" },
            // What they're building, without sounding like money only; and
            // not "my goals", which love can be.
            { id: "proyectos", label: "Mi carrera y mis proyectos" },
            { id: "libertad", label: "Mi libertad" },
            // The first version's, for the readings that ranked them.
            { id: "familia", label: "Familia", retired: true },
            { id: "amigos", label: "Amigos", retired: true },
            { id: "dinero", label: "Éxito financiero", retired: true },
        ],
    },
    {
        id: "pregunta",
        question: "¿Qué quieres saber primero?",
        // Each question only where it means something. "That person"
        // exists only for who named one ("no one in mind" rules it out),
        // and whoever is happy together isn't asked whether to leave.
        options: [
            {
                id: "volvera",
                label: "Si esa persona va a volver",
                showIf: [
                    { situacion: ["ruptura"] },
                    { situacion: ["complicado"], complica: ["idas_y_vueltas"] },
                ],
            },
            {
                id: "pasara",
                label: "Si va a pasar algo con esa persona",
                // Not where they're already together (or a third one makes
                // "that person" unclear): only a crush, or "we're nothing yet".
                showIf: [
                    { situacion: ["alguien"] },
                    { situacion: ["complicado"], complica: ["sin_nombre"] },
                ],
            },
            {
                id: "futuro",
                label: "Hacia dónde va lo nuestro",
                showIf: [{ situacion: ["relacion", "complicado"] }],
            },
            {
                id: "cuidar",
                label: "Cómo cuidar lo que tenemos",
                showIf: [
                    {
                        situacion: ["relacion"],
                        como_estan: ["muy_bien", "algo_falta", "rutina"],
                    },
                ],
            },
            {
                id: "quedarme",
                label: "Si debo quedarme o irme",
                showIf: [
                    {
                        situacion: ["relacion"],
                        como_estan: [
                            "algo_falta",
                            "rutina",
                            "peleas",
                            "caminos",
                            "dudas",
                        ],
                    },
                    { situacion: ["complicado"] },
                ],
            },
            {
                id: "cuando",
                label: "Cuándo llega alguien para mí",
                showIf: [{ situacion: ["soltera", "ruptura"] }],
            },
            {
                id: "por_que",
                label: "Por qué me pasa siempre lo mismo",
                relabel: [{ when: NEVER, label: "Por qué todavía no me pasa" }],
            },
            {
                id: "quien",
                label: "Qué tipo de persona me conviene",
                showIf: [
                    {
                        situacion: [
                            "soltera",
                            "alguien",
                            "ruptura",
                            "complicado",
                        ],
                    },
                ],
            },
        ],
    },
];

/**
 * No longer asked, still described: readings made before keep their
 * answers, and their chat still reads them.
 */
const RETIRED: readonly QuizQuestion[] = [
    {
        id: "necesidad",
        question: "En el amor, lo que más necesitas es…",
        options: [
            {
                id: "seguridad",
                label: {
                    femenino: "Sentirme segura",
                    masculino: "Sentirme seguro",
                    neutro: "Sentir seguridad",
                },
            },
            { id: "pasion", label: "Pasión y química" },
            { id: "libertad", label: "Espacio y libertad" },
            { id: "admiracion", label: "Admirar a la otra persona" },
            { id: "complicidad", label: "Complicidad y amistad" },
        ],
    },
];

/** The option they picked on this question; none for a ranking. */
export function chosen(
    answers: readonly QuizAnswer[],
    questionId: string,
): string | undefined {
    const answer = answers.find((a) => a.questionId === questionId);
    return answer && "optionId" in answer ? answer.optionId : undefined;
}

const answeredWith = (answers: readonly QuizAnswer[], on: AnsweredWith) =>
    chosen(answers, on.questionId) === on.optionId;

/** Whether these answers meet a condition. */
export function holds(answers: readonly QuizAnswer[], when: When): boolean {
    return Object.entries(when).every(([questionId, options]) =>
        options.includes(chosen(answers, questionId) ?? ""),
    );
}

/** The options this reader is offered, after their earlier answers. */
export function optionsFor(
    question: QuizQuestion,
    answers: readonly QuizAnswer[],
): QuizOption[] {
    return question.options.filter(
        (o) =>
            !o.retired &&
            (!o.showIf || o.showIf.some((when) => holds(answers, when))),
    );
}

/** The question as this reader is asked it. */
export function questionFor(
    question: QuizQuestion,
    answers: readonly QuizAnswer[],
): string {
    return (
        question.reword?.find((r) => holds(answers, r.when))?.question ??
        question.question
    );
}

/** The questions these answers lead to, in order: follow-ups only after theirs. */
export function questionsFor(
    answers: readonly QuizAnswer[],
    quiz: readonly QuizQuestion[] = LOVE_QUIZ,
): QuizQuestion[] {
    return quiz.filter((q) => !q.after || answeredWith(answers, q.after));
}

/**
 * Whether an answer is one this question takes, as it was offered after
 * the others: one of its options, or all of them in order.
 */
function fits(
    question: QuizQuestion,
    answer: QuizAnswer,
    answers: readonly QuizAnswer[],
): boolean {
    const ids = optionsFor(question, answers).map((o) => o.id);
    if ((question.kind ?? "choice") === "choice")
        return "optionId" in answer && ids.includes(answer.optionId);
    // As many as there are options and every one in: each once.
    return (
        "ranking" in answer &&
        answer.ranking.length === ids.length &&
        ids.every((id) => answer.ranking.includes(id))
    );
}

/**
 * How many questions each reader answers, whatever their path: all those
 * asked of everyone, and one follow-up.
 */
export function quizLength(quiz: readonly QuizQuestion[] = LOVE_QUIZ): number {
    return (
        quiz.filter((q) => !q.after).length +
        (quiz.some((q) => q.after) ? 1 : 0)
    );
}

export const QUIZ_LENGTH = quizLength();

/**
 * Exactly the questions these answers lead to, each answered the way it
 * asks: nothing missing, nothing left from a path they turned back on.
 */
export function isCompleteQuiz(
    answers: readonly QuizAnswer[],
    quiz: readonly QuizQuestion[] = LOVE_QUIZ,
): boolean {
    const asked = questionsFor(answers, quiz);
    return (
        answers.length === asked.length &&
        asked.every((q) =>
            answers.some((a) => a.questionId === q.id && fits(q, a, answers)),
        )
    );
}

/**
 * The answers still standing after a change: those to questions still
 * asked, with options still offered (back on "where's your heart", a new
 * path drops what only the old one asked or offered).
 */
export function pruneAnswers(
    answers: readonly QuizAnswer[],
    quiz: readonly QuizQuestion[] = LOVE_QUIZ,
): QuizAnswer[] {
    const asked = questionsFor(answers, quiz);
    return answers.filter((a) => {
        const question = asked.find((q) => q.id === a.questionId);
        return question !== undefined && fits(question, a, answers);
    });
}

/** How the reader asked to be addressed; "neutro" until they say. */
export function tratoOf(answers: readonly QuizAnswer[]): Trato {
    const id = chosen(answers, "trato");
    return id === "femenino" || id === "masculino" ? id : "neutro";
}

/** A label in the reader's trato. */
export function optionLabel(label: QuizLabel, trato: Trato): string {
    return typeof label === "string" ? label : label[trato];
}

/** What an option says to this reader, after their earlier answers. */
export function labelFor(
    option: QuizOption,
    answers: readonly QuizAnswer[],
): string {
    const label =
        option.relabel?.find((r) => holds(answers, r.when))?.label ??
        option.label;
    return optionLabel(label, tratoOf(answers));
}

/**
 * An answer in words, for prompts, as the reader saw it among `all` their
 * answers. `undefined` if it isn't in the quiz.
 */
export function describeAnswer(
    answer: QuizAnswer,
    all: readonly QuizAnswer[] = [answer],
    quiz: readonly QuizQuestion[] = LOVE_QUIZ,
): { question: string; answer: string } | undefined {
    const question = [...quiz, ...RETIRED].find(
        (q) => q.id === answer.questionId,
    );
    const say = (id: string) => {
        const option = question?.options.find((o) => o.id === id);
        return option && labelFor(option, all);
    };
    const said =
        "optionId" in answer ? [say(answer.optionId)] : answer.ranking.map(say);
    if (!question || said.some((s) => s === undefined)) return undefined;
    return {
        question: questionFor(question, all),
        answer:
            "optionId" in answer
                ? (said[0] as string)
                : `${said.join(" > ")} (de más a menos importante)`,
    };
}
