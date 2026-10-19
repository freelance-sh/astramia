import { type Body, RULERS } from "./chart";
import { born, LOVE_PLAN, type ReadingPlan, type SceneContext } from "./plan";
import type { StoryBody, StoryVisual } from "./story";
import { SYNASTRY_BODIES, strongest } from "./synastry";
import type { ReadingTopic } from "./types";

/**
 * The readings past love, as plans (see `plan.ts`): each one its own scenes,
 * the facts they stand on (`facts.ts`) and the moment its free part stops.
 */

const WHEEL: StoryVisual = { kind: "wheel" };
const STAR: StoryVisual = { kind: "star" };

/** The bodies the solar-system scene can fly to. */
const IN_3D: readonly string[] = ["Sol", "Luna", "Venus", "Marte"];

// ---------- compatibility ----------

/** Both charts, the other person's outside, `focus` lit between them. */
function synastry(c: SceneContext, focus?: readonly [Body, Body]): StoryVisual {
    const f = c.facts;
    if (!f?.partner) return WHEEL;
    const pick = (list: typeof f.bodies) =>
        list.filter((p) =>
            (SYNASTRY_BODIES as readonly string[]).includes(p.body),
        );
    return {
        kind: "synastry",
        mine: pick(f.bodies),
        theirs: pick(f.partner.bodies),
        focus,
    };
}

const theirSun = (c: SceneContext) => c.facts?.partner?.sunSign ?? "";

/** The tightest contact of a tone, said as the scene's title. */
function contact(c: SceneContext, tone: "fluye" | "choca") {
    const found = strongest(
        c.facts?.contacts ?? [],
        tone === "fluye" ? ["fluye", "funde"] : "choca",
    );
    return found
        ? {
              title: `Tu ${found.mine} y su ${found.theirs}`,
              focus: [found.mine, found.theirs] as const,
          }
        : null;
}

export const COMPATIBILITY_PLAN: ReadingPlan = {
    topic: "compatibilidad",
    of: "de compatibilidad",
    about: "lo que pasa entre las dos personas",
    example: `Para alguien de Escorpio con Venus en Sagitario y Marte en Leo, y esa persona de Leo con Venus en Cáncer y Marte en Virgo (pareja de hace unos meses, hablan por horas, chocan en los tiempos de cada quien):
suns: Tú eres Escorpio: antes de confiar, miras despacio. Esa persona es Leo: llega con todo y quiere que se note. Por eso al principio te encandila y a la vez te hace dudar. Tú cuidas lo que es de ustedes; esa persona lo quiere contar.
venuses: Venus habla de cómo amamos. La tuya está en Sagitario: quieres a alguien con quien reírte y salir a ver el mundo. La de esa persona está en Cáncer: ama cuidando, con detalles y sin apuro. Tú le das aire; esa persona te da un lugar donde volver.
chemistry: Marte es el deseo, cómo vamos por lo que queremos. El de esa persona está en Virgo: muestra que quiere con hechos pequeños. A tu Venus le encanta, y por eso una charla larga se vuelve otra cosa sin aviso. Pero cuando esa persona [corte] pide tiempo para ordenar su semana, tu Marte en Leo lo lee como distancia, y ahí empieza el choque que ya conoces.`,
    free: [
        {
            key: "suns",
            chapter: "Cómo se encuentran",
            eyebrow: () => "Tú y esa persona",
            title: (c) => `${c.sky.sign("Sol")} y ${theirSun(c)}`,
            visual: (c) => synastry(c, ["Sol", "Sol"]),
            label: "Sus soles",
            beside: "junto a los dos soles, el suyo y el de esa persona",
            words: [35, 50],
            brief: "qué trae cada quien según su signo solar y qué pasa apenas se juntan: si se encienden, se calman o se retan. Una escena de su día a día, cruzada con una de sus <respuestas>.",
            hint: "2-4 frases: los dos soles, qué trae cada quien y qué pasa al juntarse",
        },
        {
            key: "venuses",
            chapter: "Cómo se encuentran",
            eyebrow: () => "Cómo ama cada quien",
            title: () => "Sus dos Venus",
            visual: (c) => synastry(c, ["Venus", "Venus"]),
            label: "Sus Venus",
            beside: "junto a las dos Venus, la suya y la de esa persona",
            words: [35, 50],
            brief: "qué es Venus en palabras simples, y cómo ama cada quien según la suya: qué da y qué espera recibir. Dónde se entienden sin esfuerzo.",
            hint: "2-4 frases: cómo ama cada quien según su Venus",
        },
    ],
    hook: {
        key: "chemistry",
        chapter: "Cómo se encuentran",
        eyebrow: () => "Lo que los atrae",
        title: () => "La química",
        visual: (c) => synastry(c, ["Venus", "Marte"]),
        label: "La química",
        beside: "junto a su Venus y el Marte de esa persona",
        words: [45, 70],
        brief: "qué es Marte en palabras simples, y la atracción entre los dos: su Venus con el Marte de esa persona, y su Marte con la Venus de esa persona (<entre-ustedes> dice si se tocan). Qué los enciende y qué la apaga.",
        hint: "4-6 frases: la química entre los dos, qué la enciende y qué la apaga",
    },
    paid: [
        {
            key: "moons",
            chapter: "Lo que necesitan",
            eyebrow: () => "Para estar en paz",
            title: () => "Sus lunas",
            visual: (c) => synastry(c, ["Luna", "Luna"]),
            label: "Sus lunas",
            beside: "junto a las dos lunas",
            words: [30, 45],
            brief: "qué es la Luna en palabras simples, y qué necesita cada quien para sentirse en paz con la otra persona. Si una Luna no está en <carta> o <su-carta> (falta la hora), dilo con honestidad en media frase y habla de lo que sí se sabe.",
            hint: "2-3 frases: lo que cada quien necesita para estar en paz",
        },
        {
            key: "flow",
            chapter: "Donde fluyen",
            eyebrow: () => "Sin esfuerzo",
            title: (c) => contact(c, "fluye")?.title ?? "Donde fluyen",
            visual: (c) => synastry(c, contact(c, "fluye")?.focus),
            label: "Donde fluyen",
            beside: "junto al lazo más armonioso entre sus cartas",
            words: [40, 60],
            brief: "el lazo más armonioso de <entre-ustedes> (el primero que fluye o se funde): qué les sale solo y por qué, con una escena concreta. Sin su nombre técnico. Si no hay ninguno, lo que comparten sus signos.",
            hint: "3-4 frases: lo que les sale solo y por qué",
        },
        {
            key: "clash",
            chapter: "Donde chocan",
            eyebrow: () => "El roce",
            title: (c) => contact(c, "choca")?.title ?? "Donde chocan",
            visual: (c) => synastry(c, contact(c, "choca")?.focus),
            label: "Donde chocan",
            beside: "junto al lazo que más roza entre sus cartas",
            words: [45, 65],
            brief: "el lazo que más roza en <entre-ustedes> (el primero que choca): qué lo dispara en su vida y qué necesita cada quien en ese momento. Sin culpables: los dos tienen razón desde su carta. Si no hay ninguno, dónde sus signos piden cosas distintas.",
            hint: "3-5 frases: dónde chocan, por qué, y qué necesita cada quien",
        },
        {
            key: "talk",
            chapter: "Donde chocan",
            eyebrow: () => "Cómo se hablan",
            title: () => "Sus Mercurios",
            visual: (c) => synastry(c, ["Mercurio", "Mercurio"]),
            label: "Cómo se hablan",
            beside: "junto a los dos Mercurios",
            words: [30, 45],
            brief: "qué es Mercurio en palabras simples (cómo pensamos y hablamos), y cómo conversan, discuten y se reconcilian según los suyos.",
            hint: "2-3 frases: cómo se hablan y cómo discuten",
        },
        {
            key: "question",
            chapter: "Tu pregunta",
            eyebrow: () => "Lo que querías saber",
            title: ({ question }) => question ?? undefined,
            visual: (c) => synastry(c),
            split: true,
            label: "Tu pregunta",
            beside: "bajo su pregunta",
            words: [60, 85],
            brief: 'respóndela con honestidad y matices desde las dos cartas: qué muestran, qué señales mirar, qué depende de cada quien. Nunca un veredicto ("no son compatibles", "es tu alma gemela"), ni lo que la otra persona siente, piensa o hará: eso no está en ninguna carta.',
            hint: "4-6 frases: responde lo que quiere saber primero",
        },
        {
            key: "gesture",
            chapter: "Un gesto",
            eyebrow: () => "Para esta semana",
            title: () => "Un gesto",
            visual: () => STAR,
            label: "Un gesto para esta semana",
            beside: "junto a una estrella",
            words: [30, 45],
            brief: 'una acción concreta y pequeña que pueda hacer esta semana (con esa persona, o para sí si es su ex), pensada para estas dos cartas: algo que se pueda hacer un martes cualquiera, no "comuníquense más".',
            hint: "2-3 frases: una acción pequeña para esta semana",
        },
    ],
    closing: {
        words: [8, 16],
        brief: "una sola frase memorable sobre lo que hay entre las dos personas.",
    },
};

// ---------- personality ----------

function rising(c: SceneContext, sun = false): StoryVisual {
    const r = c.facts?.rising;
    return r
        ? {
              kind: "rising",
              sign: r.sign,
              near: r.near,
              sun: sun ? c.sky.sign("Sol") : undefined,
          }
        : WHEEL;
}

/** The body their Ascendant follows. */
const ruler = (c: SceneContext): Body | undefined =>
    c.facts?.rising ? RULERS[c.facts.rising.sign] : undefined;

/** Where the ruler was, said as a title: "Venus estaba en Aries". */
function rulerVisual(c: SceneContext): StoryVisual {
    const body = ruler(c);
    const at = c.facts?.bodies.find((p) => p.body === body);
    return body && at && IN_3D.includes(body)
        ? { kind: "planet", body: body as StoryBody, sign: at.sign }
        : WHEEL;
}

export const PERSONALITY_PLAN: ReadingPlan = {
    topic: "personalidad",
    of: "de personalidad",
    about: "quién es por dentro y cómo le ven",
    example: `Para alguien de Tauro con Luna en Géminis y Ascendente en Leo (la gente nota su calma, observa antes de hablar, le cuesta pedir ayuda):
sun: Eres Tauro: vas a tu ritmo y no te mueve cualquier cosa. Por eso la gente nota tu calma antes que tus palabras. Te da energía lo que puedes tocar y hacer con las manos. Lo que empiezas, lo terminas, aunque tarde.
moon: La Luna habla de cómo sientes y de lo que necesitas para estar en paz. La tuya está en Géminis: sientes pensando, y necesitas poner en palabras lo que te pasa. Por eso una buena conversación te calma más que el silencio.
rising: El Ascendente es el signo que salía por el horizonte cuando naciste: es la primera impresión, cómo te ven antes de conocerte. El tuyo es Leo. Por eso, aunque observes antes de hablar, al entrar a un lugar se nota que llegaste. La gente te imagina segura de todo. Y lo que casi nadie sabe es que [corte] esa seguridad la armaste para no tener que pedir ayuda, y te pesa más de lo que muestras.`,
    free: [
        {
            key: "sun",
            chapter: "Quién eres",
            eyebrow: born,
            title: ({ sky }) => sky.sun.title,
            visual: ({ sky }) => sky.sun.visual,
            label: "El Sol",
            beside: "junto al Sol en su signo, el que conoce",
            words: [30, 45],
            brief: "su signo de siempre, sin lugares comunes: qué le mueve y qué le da energía, con una escena de su vida que cruce una de sus <respuestas>.",
            hint: "2-4 frases, solo el Sol: qué le mueve y qué le da energía",
        },
        {
            key: "moon",
            chapter: "Quién eres",
            eyebrow: () => "Por dentro",
            title: ({ sky }) => sky.moon.title,
            visual: ({ sky }) => sky.moon.visual,
            label: "La Luna",
            beside: "junto a la Luna en su signo",
            words: [30, 45],
            brief: "qué es la Luna en palabras simples (cómo siente y qué necesita para estar en paz) y lo que dice la suya.",
            hint: "2-3 frases, solo la Luna: cómo siente y qué necesita",
        },
    ],
    hook: {
        key: "rising",
        chapter: "Cómo te ven",
        eyebrow: () => "Cuando llegas",
        title: (c) =>
            c.facts?.rising
                ? `${c.facts.rising.sign} salía por el horizonte`
                : undefined,
        visual: (c) => rising(c),
        label: "El Ascendente",
        beside: "junto al signo que salía por el horizonte cuando nació",
        words: [45, 70],
        brief: "qué es el Ascendente en palabras simples (el signo que salía por el horizonte cuando nació: la primera impresión, cómo le ven antes de conocerle) y cómo le ven por el suyo. Si <carta> dice que está cerca de otro signo, dilo con un matiz honesto. Lo que queda en el aire es la distancia entre cómo le ven y quién es.",
        hint: "4-6 frases: su Ascendente, cómo le ven antes de conocerle",
    },
    paid: [
        {
            key: "sunMoon",
            chapter: "Quién eres por dentro",
            eyebrow: () => "Juntos",
            title: () => "El Sol y la Luna",
            visual: () => ({ kind: "pair", bodies: ["Sol", "Luna"] }),
            label: "El Sol y la Luna, juntos",
            beside: "junto al Sol y la Luna",
            words: [40, 60],
            brief: "lo que quiere (su Sol) y lo que necesita (su Luna): dónde se ayudan y dónde se pelean por dentro. Si en <carta> hay un aspecto entre ellos, cuéntalo sin su nombre técnico.",
            hint: "3-4 frases: lo que quiere y lo que necesita, juntos",
        },
        {
            key: "mask",
            chapter: "Cómo te ven",
            eyebrow: () => "Lo que no se ve",
            title: () => "Tu Ascendente y tu Sol",
            visual: (c) => rising(c, true),
            label: "Tu Ascendente y tu Sol",
            beside: "junto a su Ascendente y su Sol",
            words: [40, 60],
            brief: "la distancia entre la primera impresión (su Ascendente) y quién es (su Sol): qué malentendidos le trae con la gente y cómo usarla a su favor.",
            hint: "3-4 frases: entre cómo le ven y quién es",
        },
        {
            key: "ruler",
            chapter: "Cómo te ven",
            eyebrow: () => "Lo que te guía",
            title: (c) => {
                const body = ruler(c);
                const at = c.facts?.bodies.find((p) => p.body === body);
                return body && at ? `${body} estaba en ${at.sign}` : undefined;
            },
            visual: rulerVisual,
            label: "El planeta que guía tu Ascendente",
            beside: "junto al planeta que guía su Ascendente",
            words: [30, 45],
            brief: "cada signo tiene un planeta que lo guía, y <carta> dice cuál guía su Ascendente y dónde estaba: qué mueve ese planeta en palabras simples y hacia dónde tiende a llevar su vida.",
            hint: "2-3 frases: el planeta que guía su Ascendente y hacia dónde le lleva",
        },
        {
            key: "strength",
            chapter: "Tu fuerza",
            eyebrow: () => "Lo que te sostiene",
            title: () => "Tu mayor fuerza",
            visual: () => WHEEL,
            label: "Tu mayor fuerza",
            beside: "junto a su carta completa",
            words: [40, 55],
            brief: "su mayor fuerza según su carta (el elemento que domina, o el aspecto más armonioso de <carta>), en una escena concreta donde se ve.",
            hint: "3-4 frases: su mayor fuerza, en una escena",
        },
        {
            key: "question",
            chapter: "Tu pregunta",
            eyebrow: () => "Lo que querías saber",
            title: ({ question }) => question ?? undefined,
            visual: () => WHEEL,
            split: true,
            label: "Tu pregunta",
            beside: "bajo su pregunta",
            words: [60, 85],
            brief: "respóndela con honestidad y matices desde su carta: qué muestra, qué señales mirar, qué depende de su decisión. Nunca una predicción cerrada.",
            hint: "4-6 frases: responde lo que quiere entender primero",
        },
        {
            key: "gesture",
            chapter: "Un gesto",
            eyebrow: () => "Para esta semana",
            title: () => "Un gesto",
            visual: () => STAR,
            label: "Un gesto para esta semana",
            beside: "junto a una estrella",
            words: [30, 45],
            brief: 'una acción concreta y pequeña, hecha para esta persona, que pueda hacer esta semana (algo que se pueda hacer un martes cualquiera, no "conócete más").',
            hint: "2-3 frases: una acción pequeña para esta semana",
        },
    ],
    closing: {
        words: [8, 16],
        brief: "una sola frase memorable sobre quién es.",
    },
};

// ---------- path ----------

function transits(
    c: SceneContext,
    focus?: { body: string; natal?: string },
): StoryVisual {
    const f = c.facts;
    if (!f) return WHEEL;
    return {
        kind: "transits",
        natal: f.rising ? [...f.bodies, f.rising] : f.bodies,
        sky: f.sky,
        focus,
    };
}

/** The weightiest transit now, or its own cycle when `cycle`. */
const leading = (c: SceneContext, cycle = false) =>
    (cycle && c.facts?.transits.find((t) => t.cycle)) || c.facts?.transits[0];

/** A slow planet's transit, if it touches anything now. */
const touching = (c: SceneContext, body: string) =>
    c.facts?.transits.find((t) => t.body === body);

const signOf = (c: SceneContext, body: string) =>
    c.facts?.sky.find((p) => p.body === body)?.sign;

export const PATH_PLAN: ReadingPlan = {
    topic: "camino",
    of: "de camino personal",
    about: "el momento de vida que atraviesa",
    example: `Para alguien de 29 años, de Escorpio con Venus en Capricornio, con Saturno volviendo a su lugar y en cuadratura con su Venus (siente que no avanza, le pesa una decisión pendiente, quiere estabilidad):
now: Saturno es el planeta del tiempo y de lo que se construye despacio. Hoy pasa en ángulo tenso con tu Venus, la que habla de lo que quieres y valoras. Por eso lo que antes te gustaba ahora te pide más, y lo que te hacía bien ya no alcanza.
chapter: A tus 29 años, Saturno vuelve al lugar donde estaba cuando naciste. Pasa a todos más o menos a esta edad, y se siente como un examen. Lo que construiste sin ganas empieza a crujir. Lo que es tuyo de verdad, se queda.
asks: Por eso esa decisión que tienes pendiente no es un capricho: tu cielo te pide elegir qué sostener. Y lo que pide no es [corte] que lo resuelvas de golpe, sino que dejes de cargar lo que ya no elegirías hoy.`,
    free: [
        {
            key: "now",
            chapter: "Lo que estás viviendo",
            eyebrow: () => "Hoy",
            title: (c) => {
                const t = leading(c);
                return t
                    ? t.cycle
                        ? `${t.body} y su propio lugar`
                        : `${t.body} y tu ${t.natal}`
                    : "Tu cielo hoy";
            },
            visual: (c) => {
                const t = leading(c);
                return transits(c, t && { body: t.body, natal: t.natal });
            },
            label: "Lo que estás viviendo",
            beside: "junto al planeta lento que más pesa hoy en su carta",
            words: [35, 50],
            brief: "el paso que más pesa hoy (el primero de <ahora>): qué es ese planeta en palabras simples, qué toca de su carta y cómo se siente en su vida, cruzado con una de sus <respuestas>. Si <ahora> está vacío, dónde están Júpiter y Saturno respecto a sus signos.",
            hint: "2-4 frases: el planeta que más pesa hoy y qué toca",
        },
        {
            key: "chapter",
            chapter: "Lo que estás viviendo",
            eyebrow: (c) => (c.facts ? `A tus ${c.facts.age} años` : undefined),
            title: () => "El capítulo que se abre",
            visual: (c) => {
                const t = leading(c, true);
                return transits(c, t && { body: t.body, natal: t.natal });
            },
            label: "El capítulo que se abre",
            beside: "junto al ciclo que marca su edad",
            words: [35, 50],
            brief: "el capítulo de vida que marca su edad: si <ahora> trae un ciclo (un planeta que vuelve a su lugar, o en ángulo tenso con su propio lugar), cuéntalo en palabras simples, como algo que le pasa a todos más o menos a esa edad. Si no, el capítulo que abre el planeta del campo anterior.",
            hint: "2-4 frases: el capítulo de vida que se abre a su edad",
        },
    ],
    hook: {
        key: "asks",
        chapter: "Lo que te pide",
        eyebrow: () => "Este momento",
        title: () => "Lo que te pide",
        visual: (c) => transits(c),
        label: "Lo que te pide",
        beside: "junto a su cielo de hoy",
        words: [45, 70],
        brief: "qué le pide este momento, nacido de los dos campos anteriores: un cambio de mirada concreto, no un consejo general.",
        hint: "4-6 frases: lo que le pide este momento",
    },
    paid: [
        {
            key: "growth",
            chapter: "Lo que se abre",
            eyebrow: () => "Júpiter",
            title: (c) => {
                const sign = signOf(c, "Júpiter");
                return sign ? `Júpiter en ${sign}` : undefined;
            },
            visual: (c) =>
                transits(c, {
                    body: "Júpiter",
                    natal: touching(c, "Júpiter")?.natal,
                }),
            label: "Lo que se abre",
            beside: "junto a Júpiter",
            words: [35, 50],
            brief: "qué es Júpiter en palabras simples (lo que crece y se abre) y dónde se le abren puertas este año: lo que toca de su carta en <ahora> o en <cielo>. Algo concreto que pueda hacer para aprovecharlo.",
            hint: "2-4 frases: dónde se le abren puertas este año",
        },
        {
            key: "test",
            chapter: "Lo que se construye",
            eyebrow: () => "Saturno",
            title: (c) => {
                const sign = signOf(c, "Saturno");
                return sign ? `Saturno en ${sign}` : undefined;
            },
            visual: (c) =>
                transits(c, {
                    body: "Saturno",
                    natal: touching(c, "Saturno")?.natal,
                }),
            label: "Lo que se construye",
            beside: "junto a Saturno",
            words: [35, 50],
            brief: "lo que Saturno le pide construir o soltar (en <ahora> o en <cielo>): qué le cuesta y qué gana si lo hace. Si en los campos anteriores ya hablaste de Saturno, cuenta lo nuevo.",
            hint: "2-4 frases: lo que le pide construir o soltar",
        },
        {
            key: "question",
            chapter: "Tu pregunta",
            eyebrow: () => "Lo que querías saber",
            title: ({ question }) => question ?? undefined,
            visual: (c) => transits(c),
            split: true,
            label: "Tu pregunta",
            beside: "bajo su pregunta",
            words: [60, 85],
            brief: "respóndela con honestidad y matices desde su cielo de hoy y del año: qué muestra, qué señales mirar, qué depende de su decisión. Nunca una predicción cerrada ni una fecha que no esté en <cielo>.",
            hint: "4-6 frases: responde lo que quiere saber primero",
        },
        {
            key: "moments",
            kind: "moments",
            chapter: "Lo que viene",
            eyebrow: () => "Los próximos meses",
            title: () => "Tu año",
            visual: (c) => ({ kind: "path", events: c.facts?.path ?? [] }),
            label: "Lo que viene",
            beside: "junto a los planetas lentos en los próximos meses",
            words: [20, 35],
            count: [2, 3],
            brief: 'elige 2 o 3 momentos de <cielo>, por su número, sobre todo los que tocan su carta. Para cada uno, 20 a 35 palabras que empiecen con su fecha tal como viene ("A mediados de marzo…") y digan qué le abre o le pide. Usa solo <cielo>.',
            hint: "momentos de <cielo>, cada uno empieza con su fecha",
        },
        {
            key: "gesture",
            chapter: "Un gesto",
            eyebrow: () => "Para esta semana",
            title: () => "Un gesto",
            visual: () => STAR,
            label: "Un gesto para esta semana",
            beside: "junto a una estrella",
            words: [30, 45],
            brief: 'una acción concreta y pequeña, hecha para su momento, que pueda hacer esta semana (algo que se pueda hacer un martes cualquiera, no "confía en el proceso").',
            hint: "2-3 frases: una acción pequeña para esta semana",
        },
    ],
    closing: {
        words: [8, 16],
        brief: "una sola frase memorable sobre el capítulo que vive.",
    },
};

export const PLANS: Record<ReadingTopic, ReadingPlan> = {
    amor: LOVE_PLAN,
    compatibilidad: COMPATIBILITY_PLAN,
    personalidad: PERSONALITY_PLAN,
    camino: PATH_PLAN,
};

export function planFor(topic: ReadingTopic): ReadingPlan {
    return PLANS[topic];
}
