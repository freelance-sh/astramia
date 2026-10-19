import { z } from "zod";
import type { ReadingFacts } from "./facts";
import { MOON_PHASES, type SkyFacts } from "./sky-facts";
import type { StoryVisual } from "./story";
import type { ReadingTopic, SkyEvent } from "./types";

/**
 * A kind of reading, as data: its scenes in order, what each one shows,
 * what the model writes beside it, and where the free part stops. The
 * story, the preview and its paywall, the prompts' list of scenes, the
 * model's output schemas and the plain-text version are all built from a
 * plan: a new kind of reading is a new plan, not new plumbing.
 */

/** What a scene can use to title and draw itself. */
export interface SceneContext {
    sky: SkyFacts;
    /** Their first question, said back to them. */
    question: string | null;
    /** <cielo>'s events: the months ahead. */
    skyAhead: readonly SkyEvent[];
    /** The readings past love: their extra sky (`facts.ts`). */
    facts: ReadingFacts | null;
}

/**
 * One scene: what's on screen, and the text read beside it. A "moments"
 * scene is several short texts, each pinned to one of <cielo>'s events.
 */
export interface PlanScene {
    key: string;
    kind?: "text" | "moments";
    /** The chapter it belongs to, named in the header. */
    chapter: string;
    eyebrow?: (c: SceneContext) => string | undefined;
    title?: (c: SceneContext) => string | undefined;
    /** A fixed fact about what's on screen (what that Moon phase is). */
    note?: (c: SceneContext) => string | undefined;
    visual: (c: SceneContext) => StoryVisual;
    /** A long text goes over two screens. */
    split?: boolean;
    /** Its heading when the reading is read as plain text (chat, judge). */
    label: string;
    /** For the model: next to what it's read ("junto a Venus en su signo"). */
    beside: string;
    words: readonly [number, number];
    /** For "moments": how many to write. */
    count?: readonly [number, number];
    /** For the model: what to write. */
    brief: string;
    /** For the output schema: what the field holds, in one line. */
    hint: string;
}

export interface ReadingPlan {
    topic: ReadingTopic;
    /** What it reads about, after "lectura": "de amor". */
    of: string;
    /** What it should leave feeling understood: "su vida amorosa". */
    about: string;
    /** The free prompt's example: the shape of its free scenes. */
    example: string;
    /** Written before paying and shown whole. */
    free: readonly PlanScene[];
    /**
     * Where the free part stops, at its most intriguing: written before
     * paying too, its first sentences shown and the rest locked.
     */
    hook: PlanScene;
    /** Written once paid. */
    paid: readonly PlanScene[];
    /** The last line, said once the story is over. */
    closing: { words: readonly [number, number]; brief: string };
}

/**
 * Where the model marks, inside the hook it writes, the end of what's
 * free: it picks the words that leave the most wanting to read on.
 */
export const CUT_MARK = "[corte]";

export const born = () => "El día que naciste";

/** The love reading: how they love, what they need, their question, what's coming. */
export const LOVE_PLAN: ReadingPlan = {
    topic: "amor",
    of: "de amor",
    about: "su vida amorosa",
    example: `Para alguien con Venus en Acuario y Marte en Tauro (le gusta alguien que aún no lo sabe, se aleja cuando se pone serio, si tardan en responderle hace como si nada):
venus: Venus habla de cómo te enamoras. La tuya está en Acuario: quieres querer con la puerta abierta. Por eso respondes rápido, con chistes y audios largos. Hasta el día en que te preguntan qué son. Ahí tardas horas en contestar.
mars: Marte es cómo deseas. El tuyo está en Tauro: vas lento, pero cuando quieres, no sueltas. Te enciende lo que se toca, como un abrazo largo. Te apaga la prisa.
venusMars: Juntos, tu Venus y tu Marte hacen algo curioso. Empiezas con todo, y justo cuando la otra persona se acerca, algo en ti frena. Y frena por algo que casi nadie ve: tu Venus [corte] pide aire y tu Marte pide quedarse, y esa noche gana el que llegó primero.`,
    free: [
        {
            key: "venus",
            chapter: "Cómo amas",
            eyebrow: born,
            title: ({ sky }) => sky.venus.title,
            visual: ({ sky }) => sky.venus.visual,
            label: "Venus",
            beside: "junto a Venus en su signo",
            words: [30, 45],
            brief: "empieza por lo que es Venus, en palabras simples, y lo que dice la suya. Después, una escena concreta de su vida que lo muestre, cruzada con una de sus <respuestas>.",
            hint: "2-4 frases cortas, solo Venus: cómo se enamora y qué le atrae",
        },
        {
            key: "mars",
            chapter: "Cómo amas",
            eyebrow: () => "Ese mismo día",
            title: ({ sky }) => sky.mars.title,
            visual: ({ sky }) => sky.mars.visual,
            label: "Marte",
            beside: "junto a Marte en su signo",
            words: [30, 45],
            brief: "lo que es Marte en palabras simples, y cómo desea: qué lo enciende y qué lo apaga, con un detalle de sus <respuestas>.",
            hint: "2-4 frases cortas, solo Marte: cómo desea y va por lo que quiere",
        },
    ],
    hook: {
        key: "venusMars",
        chapter: "Cómo amas",
        eyebrow: () => "Juntos",
        title: () => "Venus y Marte",
        visual: () => ({ kind: "pair", bodies: ["Venus", "Marte"] }),
        label: "Venus y Marte, juntos",
        beside: "junto a Venus y Marte",
        words: [45, 70],
        brief: "qué se repite en su vida amorosa cuando los dos actúan a la vez, y por qué. Si en <carta> hay un aspecto entre ellos, cuéntalo sin su nombre técnico.",
        hint: "4-6 frases: Venus y Marte juntos, qué se repite y por qué",
    },
    paid: [
        {
            key: "moonPhase",
            chapter: "Lo que necesitas",
            eyebrow: born,
            title: ({ sky }) => MOON_PHASES[sky.phase].title,
            note: ({ sky }) => MOON_PHASES[sky.phase].sky,
            visual: ({ sky }) => ({ kind: "moonPhase", phase: sky.phase }),
            label: "La Luna con que naciste",
            beside: "junto a la Luna en la fase con que nació",
            words: [15, 30],
            brief: "qué dice esa Luna de su forma de amar. La pantalla ya mostró la fase y qué es: no la expliques ni la nombres.",
            hint: "1-2 frases: qué dice de su forma de amar su Luna natal",
        },
        {
            key: "moon",
            chapter: "Lo que necesitas",
            eyebrow: born,
            title: ({ sky }) => sky.moon.title,
            visual: ({ sky }) => sky.moon.visual,
            label: "La Luna",
            beside: "junto a la Luna en su signo",
            words: [30, 45],
            brief: "qué necesita para sentirse en casa con alguien. Si la Luna es incierta, dilo con un matiz honesto.",
            hint: "2-3 frases, solo la Luna: qué necesita para estar en paz",
        },
        {
            key: "sun",
            chapter: "Lo que necesitas",
            eyebrow: ({ sky }) => `Por eso eres ${sky.sign("Sol")}`,
            title: ({ sky }) => sky.sun.title,
            visual: ({ sky }) => sky.sun.visual,
            label: "El Sol",
            beside: "junto al Sol en su signo, el que conoce",
            words: [25, 40],
            brief: "su signo de siempre, visto desde el amor.",
            hint: "2 frases, solo el Sol: su signo en el amor",
        },
        {
            key: "moonSun",
            chapter: "Lo que necesitas",
            eyebrow: () => "Juntos",
            title: () => "La Luna y el Sol",
            visual: () => ({ kind: "pair", bodies: ["Luna", "Sol"] }),
            label: "La Luna y el Sol, juntos",
            beside: "junto a la Luna y el Sol",
            words: [40, 60],
            brief: "solo esos dos: lo que necesita y de dónde viene lo que más le dolió.",
            hint: "3-4 frases: Luna y Sol juntos, lo que necesita y lo que le dolió",
        },
        {
            key: "question",
            chapter: "Tu pregunta",
            eyebrow: () => "Lo que querías saber",
            title: ({ question }) => question ?? undefined,
            visual: () => ({ kind: "wheel" }),
            split: true,
            label: "Tu pregunta",
            beside: "bajo su pregunta",
            words: [60, 85],
            brief: 'respóndela con honestidad y matices: qué muestra su carta, qué señales mirar, qué depende de su decisión. Nunca una predicción cerrada, ni lo que la otra persona hará o sentirá (ni siquiera "es probable que te escriba"): eso no está en su carta.',
            hint: "4-6 frases: responde lo que quiere saber primero",
        },
        {
            key: "moments",
            kind: "moments",
            chapter: "Lo que viene",
            eyebrow: () => "Desde hoy",
            title: () => "El camino de Venus",
            visual: ({ skyAhead }) => ({ kind: "venusPath", events: skyAhead }),
            label: "Lo que viene",
            beside: "junto a Venus viajando por los próximos meses",
            words: [20, 35],
            count: [2, 3],
            brief: 'elige 2 o 3 momentos de <cielo>, por su número, sobre todo los que tocan sus signos. Para cada uno, 20 a 35 palabras que empiecen con su fecha tal como viene ("A finales de octubre…") y digan qué le abre o le pide según su carta. Usa solo <cielo>.',
            hint: "momentos de <cielo>, cada uno empieza con su fecha",
        },
        {
            key: "gesture",
            chapter: "Un gesto",
            eyebrow: () => "Para esta semana",
            title: () => "Un gesto",
            visual: () => ({ kind: "star" }),
            label: "Un gesto para esta semana",
            beside: "junto a una estrella",
            words: [30, 45],
            brief: 'una acción concreta y pequeña, hecha para esta persona, que pueda hacer esta semana (algo que se pueda hacer un martes cualquiera, no "ámate más").',
            hint: "2-3 frases: una acción pequeña para esta semana",
        },
    ],
    closing: {
        words: [8, 16],
        brief: "una sola frase memorable que querría guardar.",
    },
};

/** Every scene of a plan, in the order it's read. */
export function scenesOf(plan: ReadingPlan): readonly PlanScene[] {
    return [...plan.free, plan.hook, ...plan.paid];
}

export interface Moment {
    event: number;
    text: string;
}

/**
 * A reading's texts by scene key (`moments` holds a list, `closing` the
 * last line). Readings of any age parse into it; a scene without its text
 * is simply not shown.
 */
export type SceneTexts = Readonly<Record<string, unknown>>;

export function sceneText(texts: SceneTexts, key: string): string | undefined {
    const value = texts[key];
    return typeof value === "string" && value.trim() ? value : undefined;
}

export function sceneMoments(texts: SceneTexts): Moment[] {
    const value = texts.moments;
    return Array.isArray(value)
        ? value.filter(
              (m): m is Moment =>
                  typeof m?.event === "number" && typeof m?.text === "string",
          )
        : [];
}

const momentsField = z
    .array(
        z.object({
            event: z
                .number()
                .int()
                .min(1)
                .describe("número del momento en <cielo>"),
            text: z.string().describe("1-2 frases que empiezan con su fecha"),
        }),
    )
    .min(1)
    .max(4);

function field(scene: PlanScene, hint = scene.hint) {
    return scene.kind === "moments" ? momentsField : z.string().describe(hint);
}

/** What the model fills before paying: the free scenes and the hook. */
export function freeSchema(plan: ReadingPlan) {
    return z.object({
        ...Object.fromEntries(plan.free.map((s) => [s.key, field(s)])),
        [plan.hook.key]: field(
            plan.hook,
            `${plan.hook.hint}, con ${CUT_MARK} donde se corta lo gratis`,
        ),
    });
}

/** What the model fills once paid: the rest, and the last line. */
export function paidSchema(plan: ReadingPlan) {
    return z.object({
        ...Object.fromEntries(plan.paid.map((s) => [s.key, field(s)])),
        closing: z.string().describe("una sola frase breve y memorable"),
    });
}
