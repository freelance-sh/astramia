import type { MoonPhaseName } from "@/core/landing/domain/ephemeris";
import type { Body } from "./chart";
import type { ReadingFacts } from "./facts";
import { toReadingBlocks } from "./markdown";
import {
    type PlanScene,
    type ReadingPlan,
    type SceneContext,
    type SceneTexts,
    sceneMoments,
    scenesOf,
    sceneText,
} from "./plan";
import { planFor } from "./plans";
import { chosen } from "./quiz";
import { FIRST_QUESTION } from "./quizzes";
import { parseTexts } from "./reading-content";
import { MOON_PHASES, skyFacts } from "./sky-facts";
import type { PathEvent } from "./transits";
import type {
    NatalChart,
    NatalPlacement,
    QuizAnswer,
    ReadingTopic,
    SkyEvent,
} from "./types";

/**
 * The paid reading as a story told on scroll: each idea is shown (the Moon
 * settling on the phase they were born under, Venus over its sign) while
 * its text is read.
 *
 * The visuals come from the chart, never from the model, so they can't
 * contradict the sky. Readings written per scene follow their plan
 * (`plan.ts`): each text next to its body. Older Markdown readings are
 * split along the five sections their prompt asked for.
 */

export type StoryBody = "Sol" | "Luna" | "Venus" | "Marte";

/** Right after the free paragraph: where a buyer lands to keep reading. */
export const CONTINUE_ANCHOR = "sigue";

export type StoryVisual =
    /** The solar system the day they were born, seen from afar. */
    | { kind: "system" }
    /** Their chart with its tensions (aspects) lit. */
    | { kind: "wheel" }
    | {
          kind: "planet";
          body: StoryBody;
          sign: string;
          /** Unknown birth time and the Moon changed sign that day. */
          signs?: readonly [string, string];
      }
    /** Two bodies side by side: what they do together. */
    | { kind: "pair"; bodies: readonly [StoryBody, StoryBody] }
    /** A lunar month that comes to rest on their phase. */
    | { kind: "moonPhase"; phase: MoonPhaseName }
    /** Venus over the months ahead; `focus` is where it is (an event index). */
    | { kind: "venusPath"; events: readonly SkyEvent[]; focus?: number }
    | { kind: "star" }
    /** Two charts, one over the other: theirs outside; `focus` lights a contact. */
    | {
          kind: "synastry";
          mine: readonly NatalPlacement[];
          theirs: readonly NatalPlacement[];
          focus?: readonly [Body, Body];
      }
    /** The sign rising in the east the moment they were born. */
    | {
          kind: "rising";
          sign: string;
          /** Unsure birth time: the sign it would be 20 minutes off. */
          near: string | null;
          /** Their Sun, shown beside it ("how they see you" against "who you are"). */
          sun?: string;
      }
    /** The slow planets today around their chart; `focus` lights one transit. */
    | {
          kind: "transits";
          natal: readonly NatalPlacement[];
          sky: readonly NatalPlacement[];
          focus?: { body: string; natal?: string };
      }
    /** The slow planets' moments over the year ahead; `focus` is the one read. */
    | { kind: "path"; events: readonly PathEvent[]; focus?: number };

/** A body shown with its title, and the model's text about it. */
type SceneStep = {
    kind: "scene";
    eyebrow?: string;
    title?: string;
    /** A fixed fact about what's on screen (what that Moon phase is). */
    note?: string;
    text: string;
};
/** Older readings: a concept shown before the text uses it. */
type TitleStep = {
    kind: "title";
    eyebrow: string;
    title: string;
    line?: string;
};
type NoteStep = { kind: "note"; label: string; text: string };
type Intro = (TitleStep | NoteStep) & { visual: StoryVisual };

export type StoryStep = { visual: StoryVisual; chapter: number | null } & (
    | { kind: "prologue"; text: string }
    | { kind: "chapter"; numeral: string; label: string; title: string }
    | SceneStep
    | TitleStep
    | NoteStep
    | { kind: "paragraph"; text: string; heading?: string }
    /**
     * Where the preview stops, at its most intriguing: the hook scene's
     * first sentences, the rest blurred, and the page's own box (unlock,
     * or "being written").
     */
    | { kind: "door"; eyebrow?: string; title?: string; text?: string }
    /** The reading's last line: the story ends here, before the chat. */
    | { kind: "closing"; text: string }
);

export interface StoryChapter {
    numeral: string;
    label: string;
}

export interface Story {
    chapters: StoryChapter[];
    steps: StoryStep[];
    /** The first step that was bought (after the free ones). */
    continueAt: number;
}

export interface StoryInput {
    topic: ReadingTopic;
    teaser: string;
    content: string;
    chart: NatalChart;
    question: string | null;
    skyAhead: readonly SkyEvent[];
    /** The readings past love: their extra sky. */
    facts?: ReadingFacts | null;
}

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

/** Same key → same scene on stage: it stays put instead of replaying. */
export function visualKey(visual: StoryVisual): string {
    switch (visual.kind) {
        case "planet":
        case "moonPhase":
            // The solar system stays on stage: the camera pulls back from
            // one body and flies to the next instead of cutting.
            return "system";
        case "pair":
            return `pair:${visual.bodies.join("+")}`;
        default:
            // venusPath keeps one key: Venus travels between its stops; the
            // two charts, the horizon, the transits and the year stay put
            // while what they light changes.
            return visual.kind;
    }
}

/** "¿Qué quieres saber primero?" answers, said back as their question. */
const QUESTIONS: Record<string, string> = {
    // Compatibility.
    compatibles: "¿De verdad somos compatibles?",
    chocamos: "¿Por qué chocamos en lo mismo?",
    necesita: "¿Qué necesita esa persona de mí?",
    hacia_donde: "¿Hacia dónde puede ir esto?",
    no_funciono: "¿Por qué no funcionó?",
    intentarlo: "¿Tiene sentido intentarlo de nuevo?",
    // Personality.
    me_ven: "¿Por qué me ven distinto a como soy?",
    paz: "¿Qué me hace sentir en paz?",
    fuerza: "¿Cuál es mi mayor fuerza?",
    tropiezo: "¿Por qué tropiezo con lo mismo?",
    rumbo: "¿Qué camino va conmigo?",
    // Path.
    capitulo: "¿Qué capítulo estoy viviendo?",
    se_mueve: "¿Cuándo se mueve lo que está quieto?",
    me_pide: "¿Qué me pide este momento?",
    viene: "¿Qué viene en los próximos meses?",
    decision_grande: "¿Es momento de una decisión grande?",
    // Love.
    volvera: "¿Esa persona va a volver?",
    cuando: "¿Cuándo llega alguien para mí?",
    por_que: "¿Por qué me pasa siempre lo mismo?",
    quedarme: "¿Me quedo o me voy?",
    quien: "¿Qué tipo de persona me conviene?",
    pasara: "¿Va a pasar algo con esa persona?",
    futuro: "¿Hacia dónde va lo nuestro?",
    cuidar: "¿Cómo cuido lo que tenemos?",
};

export function storyQuestion(
    answers: readonly QuizAnswer[],
    topic: ReadingTopic = "amor",
): string | null {
    const id = chosen(answers, FIRST_QUESTION[topic]);
    // Never really in love: "always the same" is that it hasn't happened.
    if (id === "por_que" && chosen(answers, "ultimo_amor") === "nunca")
        return "¿Por qué todavía no me pasa?";
    // An ex: asked in the past, as the quiz offered it.
    if (chosen(answers, "vinculo") === "ex") {
        if (id === "chocamos") return "¿Por qué chocábamos en lo mismo?";
        if (id === "necesita") return "¿Qué necesitaba esa persona de mí?";
    }
    return (id && QUESTIONS[id]) ?? null;
}

const SKY: StoryVisual = { kind: "system" };
const WORDS_PER_SCREEN = 70;

/** A long answer on two screens, split at the sentence nearest its middle. */
function splitLong(text: string): string[] {
    const sentences = text.match(/[^.!?…]+[.!?…]+["»”]?\s*/g) ?? [text];
    if (text.split(/\s+/).length <= WORDS_PER_SCREEN || sentences.length < 2)
        return [text];
    const half = text.length / 2;
    let cut = 1;
    let length = 0;
    sentences.forEach((sentence, i) => {
        length += sentence.length;
        if (length <= half) cut = i + 1;
    });
    return [
        sentences.slice(0, cut).join("").trim(),
        sentences.slice(cut).join("").trim(),
    ];
}

function context(
    input: Pick<StoryInput, "chart" | "question" | "skyAhead" | "facts">,
): SceneContext {
    return {
        sky: skyFacts(input.chart),
        question: input.question,
        skyAhead: input.skyAhead,
        facts: input.facts ?? null,
    };
}

/** Numbers chapters as their first scene with a text shows up. */
function chapterNumbers(chapters: StoryChapter[]) {
    return (label: string) => () => {
        if (chapters.at(-1)?.label !== label)
            chapters.push({
                numeral:
                    NUMERALS[chapters.length] ?? String(chapters.length + 1),
                label,
            });
        return chapters.length - 1;
    };
}

/** A scene's steps, or none when its text isn't there. */
function sceneSteps(
    scene: PlanScene,
    c: SceneContext,
    texts: SceneTexts,
    chapter: () => number,
): StoryStep[] {
    if (scene.kind === "moments") {
        // Each moment moves its planet to its date; ones that point nowhere
        // are left out.
        const path = scene.visual(c);
        const events =
            path.kind === "venusPath" || path.kind === "path"
                ? path.events.length
                : 0;
        const moments = sceneMoments(texts).filter(
            (m) => m.event >= 1 && m.event <= events,
        );
        if (!moments.length) return [];
        const index = chapter();
        return moments.map(
            (moment, n): StoryStep => ({
                kind: "scene",
                eyebrow: n === 0 ? scene.eyebrow?.(c) : undefined,
                title: n === 0 ? scene.title?.(c) : undefined,
                text: moment.text,
                visual:
                    path.kind === "venusPath" || path.kind === "path"
                        ? { ...path, focus: moment.event - 1 }
                        : path,
                chapter: index,
            }),
        );
    }
    const text = sceneText(texts, scene.key);
    if (!text) return [];
    const index = chapter();
    const visual = scene.visual(c);
    const [first, ...rest] = scene.split ? splitLong(text) : [text];
    return [
        {
            kind: "scene",
            eyebrow: scene.eyebrow?.(c),
            title: scene.title?.(c),
            note: scene.note?.(c),
            text: first,
            visual,
            chapter: index,
        },
        ...rest.map(
            (more): StoryStep => ({
                kind: "paragraph",
                text: more,
                visual,
                chapter: index,
            }),
        ),
    ];
}

/** A reading written per scene, told in its plan's order. */
function planStory(
    plan: ReadingPlan,
    c: SceneContext,
    texts: SceneTexts,
    /** An older reading's paragraph, when it has no free scenes. */
    prologue?: string,
): Story {
    const chapters: StoryChapter[] = [];
    const chapterOf = chapterNumbers(chapters);
    const steps: StoryStep[] = prologue
        ? [{ kind: "prologue", text: prologue, visual: SKY, chapter: null }]
        : [];
    let continueAt = steps.length;
    for (const scene of scenesOf(plan)) {
        // A buyer comes back to the hook, to read what was blurred.
        if (scene === plan.hook) continueAt = steps.length;
        steps.push(...sceneSteps(scene, c, texts, chapterOf(scene.chapter)));
    }
    const closing = sceneText(texts, "closing");
    if (closing)
        steps.push({
            kind: "closing",
            text: closing,
            // The last image stays: the story ends where it last pointed.
            visual: steps.at(-1)?.visual ?? SKY,
            chapter: null,
        });
    return { chapters, steps, continueAt };
}

/** Older readings' five sections, in their prompt's order. */
function chapterPlan(input: StoryInput): {
    label: string;
    visual: StoryVisual;
    intro: Intro[];
}[] {
    const facts = skyFacts(input.chart);
    const moonLine = input.chart.moonRange
        ? "Ese día la Luna cambió de signo: sin tu hora exacta, tiene un pie en cada uno."
        : "La Luna es tu mundo emocional: lo que necesitas para sentirte en casa con alguien.";
    const venus: Intro = {
        kind: "title",
        eyebrow: "El día que naciste",
        title: facts.venus.title,
        line: "Venus es el planeta del amor: marca qué te atrae y cómo te entregas.",
        visual: facts.venus.visual,
    };
    const mars: Intro = {
        kind: "title",
        eyebrow: "Ese mismo día",
        title: facts.mars.title,
        line: "Marte es el impulso: cómo vas por lo que quieres, y cómo peleas.",
        visual: facts.mars.visual,
    };
    const phase = MOON_PHASES[facts.phase];
    const moonPhase: Intro[] = [
        {
            kind: "title",
            eyebrow: "El día que naciste",
            title: phase.title,
            visual: { kind: "moonPhase", phase: facts.phase },
        },
        {
            kind: "note",
            label: "Qué es",
            text: `${phase.sky} ${phase.meaning}`,
            visual: { kind: "moonPhase", phase: facts.phase },
        },
    ];
    const moon: Intro = {
        kind: "title",
        eyebrow: "El día que naciste",
        title: facts.moon.title,
        line: moonLine,
        visual: facts.moon.visual,
    };
    const sun: Intro = {
        kind: "title",
        eyebrow: "El día que naciste",
        title: facts.sun.title,
        line: `Por eso eres ${facts.sign("Sol")}: es lo que te da energía y lo que no negocias.`,
        visual: facts.sun.visual,
    };
    const path: StoryVisual = { kind: "venusPath", events: input.skyAhead };

    return [
        { label: "Cómo amas", visual: venus.visual, intro: [venus, mars] },
        {
            label: "Lo que necesitas",
            visual: moonPhase[0].visual,
            intro: [...moonPhase, moon, sun],
        },
        {
            label: "Tu pregunta",
            visual: { kind: "wheel" },
            intro: input.question
                ? [
                      {
                          kind: "title",
                          eyebrow: "Lo que querías saber",
                          title: input.question,
                          visual: { kind: "wheel" },
                      },
                  ]
                : [],
        },
        {
            label: "Lo que viene",
            visual: path,
            intro: input.skyAhead.length
                ? [
                      {
                          kind: "title",
                          eyebrow: "Desde hoy",
                          title: "El camino de Venus",
                          line: "Ya no es el cielo de cuando naciste: es el de los próximos meses, y cuándo pasa por tus signos.",
                          visual: path,
                      },
                  ]
                : [],
        },
        { label: "Un gesto", visual: { kind: "star" }, intro: [] },
    ];
}

const BOLD_ENDING = /^(.*?)\s*\*\*([^*]+)\*\*\s*$/s;

/**
 * The closing line the Markdown prompt asked for: one short sentence in bold
 * at the very end, on its own or after the last paragraph's text.
 */
function splitClosing(paragraphs: string[]): {
    paragraphs: string[];
    closing: string | null;
} {
    const last = paragraphs.at(-1);
    const match = last?.match(BOLD_ENDING);
    if (!last || !match) return { paragraphs, closing: null };
    const before = match[1].trim();
    return {
        paragraphs: before
            ? [...paragraphs.slice(0, -1), before]
            : paragraphs.slice(0, -1),
        closing: match[2].trim(),
    };
}

/**
 * An older Markdown reading. A chapter's heading leads its first paragraph,
 * so no title sits alone on an empty screen; a text that doesn't follow the
 * five sections gets chapter cards over calm backdrops.
 */
function markdownStory(input: StoryInput): Story {
    const blocks = toReadingBlocks(input.content);
    const opening: string[] = [];
    const sections: { heading: string; paragraphs: string[] }[] = [];
    for (const block of blocks) {
        if (block.kind === "heading")
            sections.push({ heading: block.text, paragraphs: [] });
        else (sections.at(-1)?.paragraphs ?? opening).push(block.text);
    }

    // The bold line closes the whole text, wherever it landed.
    const tail = sections.at(-1) ?? { heading: "", paragraphs: opening };
    const { paragraphs, closing } = splitClosing(tail.paragraphs);
    tail.paragraphs.splice(0, tail.paragraphs.length, ...paragraphs);

    const plan = sections.length === 5 ? chapterPlan(input) : null;
    const steps: StoryStep[] = [
        { kind: "prologue", text: input.teaser, visual: SKY, chapter: null },
        ...opening.map(
            (text): StoryStep => ({
                kind: "paragraph",
                text,
                visual: SKY,
                chapter: null,
            }),
        ),
    ];
    const chapters: StoryChapter[] = [];

    sections.forEach((section, i) => {
        const planned = plan?.[i];
        const numeral = NUMERALS[i] ?? String(i + 1);
        chapters.push({ numeral, label: planned?.label ?? section.heading });

        let current: StoryVisual =
            planned?.visual ?? (i % 2 ? { kind: "wheel" } : SKY);
        if (!planned)
            steps.push({
                kind: "chapter",
                numeral,
                label: "",
                title: section.heading,
                visual: current,
                chapter: i,
            });
        for (const intro of planned?.intro ?? []) {
            steps.push({ ...intro, chapter: i });
            current = intro.visual;
        }
        section.paragraphs.forEach((text, n) => {
            steps.push({
                kind: "paragraph",
                text,
                heading: planned && n === 0 ? section.heading : undefined,
                visual: current,
                chapter: i,
            });
        });
    });

    if (closing)
        steps.push({
            kind: "closing",
            text: closing,
            visual: steps.at(-1)?.visual ?? SKY,
            chapter: null,
        });

    // The paragraph was free: what was bought starts right after it.
    return { chapters, steps, continueAt: 1 };
}

/**
 * The bodies the paid part turns to, each in its sign, in order: what the
 * screen shows while that part is being written. Their Sun, if none.
 */
export function paidSkies(
    input: Pick<
        StoryInput,
        "topic" | "chart" | "question" | "skyAhead" | "facts"
    >,
): { body: StoryBody; sign: string }[] {
    const c = context(input);
    const skies = planFor(input.topic).paid.flatMap((scene) => {
        const visual = scene.visual(c);
        return visual.kind === "planet"
            ? [{ body: visual.body, sign: visual.sign }]
            : [];
    });
    return skies.length
        ? skies
        : [{ body: "Sol", sign: input.chart.placements[0].sign }];
}

/**
 * Before paying: the same story's free scenes, then the hook at its most
 * intriguing (its first sentences; the page blurs the rest and puts its
 * box there). Readings from before the free scenes open with their
 * paragraph instead.
 */
export function previewStory(
    input: Pick<
        StoryInput,
        "topic" | "teaser" | "chart" | "question" | "skyAhead" | "facts"
    >,
): Story {
    const plan = planFor(input.topic);
    const c = context(input);
    const free = parseTexts(input.teaser);
    const chapters: StoryChapter[] = [];
    const chapterOf = chapterNumbers(chapters);
    const steps: StoryStep[] = free
        ? plan.free.flatMap((scene) =>
              sceneSteps(scene, c, free, chapterOf(scene.chapter)),
          )
        : [
              {
                  kind: "prologue",
                  text: input.teaser,
                  visual: SKY,
                  chapter: null,
              },
          ];
    const hook = plan.hook;
    steps.push({
        kind: "door",
        eyebrow: hook.eyebrow?.(c),
        title: hook.title?.(c),
        text: free ? sceneText(free, hook.key) : undefined,
        visual: hook.visual(c),
        chapter: free ? chapterOf(hook.chapter)() : null,
    });
    return { chapters, steps, continueAt: 0 };
}

export function buildStory(input: StoryInput): Story {
    const paid = parseTexts(input.content);
    if (!paid) return markdownStory(input);
    const plan = planFor(input.topic);
    const free = parseTexts(input.teaser);
    // The free scenes live in the teaser; older readings carry them here.
    const texts = { ...paid, ...free };
    const hasFree = plan.free.some((scene) => sceneText(texts, scene.key));
    return planStory(
        plan,
        context(input),
        texts,
        // Bought with an older paragraph and no free scenes: it opens the story.
        hasFree ? undefined : input.teaser,
    );
}
