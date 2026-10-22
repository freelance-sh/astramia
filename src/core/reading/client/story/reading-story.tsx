"use client";

import {
    AnimatePresence,
    MotionConfig,
    motion,
    useScroll,
    useSpring,
} from "motion/react";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
    metaEventOnce,
    READING_VALUE,
} from "@/core/analytics/client/meta-pixel";
import {
    checkoutStarted,
    paywallButtonSeenAt,
} from "@/core/analytics/client/paywall";
import { flush, track } from "@/core/analytics/client/track";
import { Starfield } from "@/core/landing/client/effects";
import { AstramiaLogo } from "@/core/landing/client/sections/astramia-logo";
import { OFFER } from "@/core/landing/domain/content";
import { longDate, shortDate } from "@/core/reading/domain/chart";
import { planFor } from "@/core/reading/domain/plans";
import {
    buildStory,
    CONTINUE_ANCHOR,
    previewStory,
    type StoryStep,
} from "@/core/reading/domain/story";
import type { Reading, ReadingTopic } from "@/core/reading/domain/types";
import { cn } from "@/frontend/lib/utils";
import { renderInline } from "../components/reading-text";
import { StoryStage } from "./story-stage";

export const CHAT_ANCHOR = "chat";

/** The cover: their whole solar system, before the camera flies anywhere. */
const COVER_STEP = -1;
const COVER = { visual: { kind: "system" }, chapter: null } as const;

/**
 * Under the blur where the hook goes on, from the word it was cut at:
 * never the real text. A wider screen holds more of it per line, so it
 * gets more, to fill the same few lines.
 */
const LOCKED_FILLER = [
    "lo que pasa tiene una razón en tu carta, y también una salida. No es casualidad: se repite y se puede ver venir.",
    " Aquí está por qué pasa y lo que puedes hacer distinto desde esta semana.",
] as const;

/** Text arrives softly as its step reaches the middle of the screen. */
const ENTER = {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.5 },
    transition: { duration: 0.9, ease: [0.2, 0.7, 0.2, 1] },
} as const;

/** Over the scene on a phone; beside it on a wide screen. */
/**
 * The door's card on a phone, where it sits over the scene. Other text
 * keeps to the bottom half (see `FADE`) and needs none.
 */
const CARD =
    "max-lg:rounded-2xl max-lg:border max-lg:border-astral-ink max-lg:bg-background/75 max-lg:p-5 max-lg:backdrop-blur-md";

/**
 * On a phone, where text dissolves going up (fractions of the screen's
 * height): gone above the first, whole below the second. The scene has
 * the half above it, as the Sun has the chat's.
 */
const FADE = [0.38, 0.47] as const;

function StepContent({
    step,
    door,
}: {
    step: StoryStep;
    /** Under the preview's last step: the page's own box. */
    door?: ReactNode;
}) {
    switch (step.kind) {
        case "prologue":
            return (
                <motion.div {...ENTER} className="flex flex-col gap-3">
                    <p className="font-mono text-[11px] text-astral-gold uppercase tracking-[0.2em]">
                        Así empezó tu lectura
                    </p>
                    <p className="text-pretty font-display text-2xl leading-snug sm:text-3xl">
                        {step.text}
                    </p>
                </motion.div>
            );
        case "chapter":
            return (
                <motion.div {...ENTER} className="flex flex-col gap-4">
                    <p className="font-mono text-[11px] text-astral-gold uppercase tracking-[0.24em]">
                        Capítulo {step.numeral}
                        {step.label && ` · ${step.label}`}
                    </p>
                    <h2 className="text-balance font-display text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
                        {step.title}
                    </h2>
                </motion.div>
            );
        case "title":
            return (
                <div className="flex flex-col gap-4">
                    <motion.p
                        {...ENTER}
                        className="font-mono text-[11px] text-astral-gold uppercase tracking-[0.24em]"
                    >
                        {step.eyebrow}
                    </motion.p>
                    <motion.h3
                        {...ENTER}
                        className="text-balance font-display text-5xl leading-[1.02] sm:text-6xl lg:text-7xl"
                    >
                        {step.title}
                    </motion.h3>
                    {step.line && (
                        <motion.p
                            {...ENTER}
                            transition={{ ...ENTER.transition, delay: 0.6 }}
                            className="max-w-md text-pretty text-lg text-muted-foreground"
                        >
                            {step.line}
                        </motion.p>
                    )}
                </div>
            );
        case "note":
            return (
                <motion.div
                    {...ENTER}
                    className="flex flex-col gap-2 border-astral-gold/60 lg:border-l lg:pl-6"
                >
                    <p className="font-mono text-[11px] text-astral-gold uppercase tracking-[0.2em]">
                        {step.label}
                    </p>
                    <p className="text-pretty text-lg leading-relaxed">
                        {step.text}
                    </p>
                </motion.div>
            );
        case "scene":
            return (
                <div className="flex flex-col gap-4">
                    {step.eyebrow && (
                        <motion.p
                            {...ENTER}
                            className="font-mono text-[11px] text-astral-gold uppercase tracking-[0.24em]"
                        >
                            {step.eyebrow}
                        </motion.p>
                    )}
                    {step.title && (
                        <motion.h3
                            {...ENTER}
                            className="text-balance font-display text-4xl leading-[1.02] sm:text-5xl lg:text-6xl"
                        >
                            {step.title}
                        </motion.h3>
                    )}
                    <motion.div
                        {...ENTER}
                        transition={{ ...ENTER.transition, delay: 0.35 }}
                        className="flex flex-col gap-3"
                    >
                        {step.note && (
                            <p className="text-pretty text-muted-foreground italic leading-relaxed">
                                {step.note}
                            </p>
                        )}
                        <p className="text-pretty text-lg leading-relaxed sm:text-xl sm:leading-relaxed">
                            {renderInline(step.text)}
                        </p>
                    </motion.div>
                </div>
            );
        case "paragraph":
            return (
                <motion.div {...ENTER} className="flex flex-col gap-3">
                    {step.heading && (
                        <h3 className="text-balance font-display text-2xl text-astral-gold sm:text-3xl">
                            {step.heading}
                        </h3>
                    )}
                    <p className="text-pretty text-lg leading-relaxed sm:text-xl sm:leading-relaxed">
                        {renderInline(step.text)}
                    </p>
                </motion.div>
            );
        case "door":
            // The hook at its peak: its first sentences, the rest blurred
            // (never on the page: that's filler), and the page's box.
            return (
                <div className="flex flex-col gap-4">
                    {/* Its heading dissolves going up, like any text; the
                        cut and the box stay whole. */}
                    <div data-fades className="ph-mask flex flex-col gap-4">
                        {step.eyebrow && (
                            <motion.p
                                {...ENTER}
                                className="font-mono text-[11px] text-astral-gold uppercase tracking-[0.24em]"
                            >
                                {step.eyebrow}
                            </motion.p>
                        )}
                        {step.title && (
                            <motion.h3
                                {...ENTER}
                                className="text-balance font-display text-4xl leading-[1.02] sm:text-5xl lg:text-6xl"
                            >
                                {step.title}
                            </motion.h3>
                        )}
                    </div>
                    <motion.div
                        {...ENTER}
                        transition={{ ...ENTER.transition, delay: 0.35 }}
                        className={cn(CARD, "ph-mask")}
                    >
                        {/* The blur starts mid-sentence, right where it was cut,
                            and fades out over its last lines. */}
                        <p
                            className="text-pretty text-lg leading-relaxed sm:text-xl sm:leading-relaxed"
                            style={{
                                maskImage:
                                    "linear-gradient(to bottom, black calc(100% - 4.5em), transparent)",
                            }}
                        >
                            {step.text && <>{renderInline(step.text)} </>}
                            <span
                                aria-hidden
                                className="select-none text-transparent [text-shadow:0_0_7px_var(--foreground)]"
                            >
                                {LOCKED_FILLER[0]}
                                <span className="max-lg:hidden">
                                    {LOCKED_FILLER[1]}
                                </span>
                            </span>
                        </p>
                    </motion.div>
                    {door && (
                        <motion.div
                            {...ENTER}
                            transition={{ ...ENTER.transition, delay: 0.6 }}
                        >
                            {door}
                        </motion.div>
                    )}
                </div>
            );
        case "closing":
            // Said and done: the story closes here, the chat is another room.
            return (
                <motion.figure
                    {...ENTER}
                    transition={{ ...ENTER.transition, duration: 1.6 }}
                    className="flex flex-col gap-5 max-lg:text-center"
                >
                    <blockquote className="text-balance font-display text-4xl text-astral-gold-soft leading-tight [text-shadow:0_2px_24px_rgb(0_0_0/70%)] sm:text-5xl lg:text-6xl">
                        {step.text}
                    </blockquote>
                    <figcaption className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.24em]">
                        Fin de tu lectura
                    </figcaption>
                </motion.figure>
            );
    }
}

/**
 * Nothing on screen is made up: every scene is their sky, computed for the
 * day (and hour, and place) they gave. The cover says so.
 */
function computedFrom(reading: Reading): string {
    // The date is in the line above; this one adds the hour and place.
    const when = reading.birthTime ? ` a las ${reading.birthTime}` : "";
    const where = reading.birthPlace ? `, en ${reading.birthPlace}` : "";
    const bodies =
        reading.topic === "amor"
            ? "del Sol, la Luna, Venus y Marte"
            : "del Sol, la Luna y los planetas";
    return `Calculado con la posición real ${bodies}${when || where ? `${when}${where}` : " ese día"}.`;
}

/** The cover's title and the story it promises, per reading. */
const COVER_COPY: Record<ReadingTopic, { title: string; story: string }> = {
    amor: {
        title: "Los astros el día que naciste",
        story: "Esta es la historia que cuenta sobre cómo amas.",
    },
    compatibilidad: {
        title: "Dos cielos, frente a frente",
        story: "Junto al de esa persona, esta es la historia que cuentan sobre lo que hay entre ustedes.",
    },
    personalidad: {
        title: "Los astros el día que naciste",
        story: "Esta es la historia que cuenta sobre quién eres.",
    },
    camino: {
        title: "Tu cielo y el de hoy",
        story: "Con el cielo de hoy encima, esta es la historia que cuenta sobre tu momento.",
    },
};

/** Steps that introduce something get the whole screen; text, a bit less. */
function stepHeight(step: StoryStep): string {
    switch (step.kind) {
        case "paragraph":
        case "note":
            return "min-h-[75svh]";
        case "scene":
            return "min-h-[90svh]";
        default:
            return "min-h-[100svh]";
    }
}

/**
 * The paid reading, told on scroll. A stage holds one scene at a time (their
 * sky, the Moon settling on their phase, Venus over its sign…) while the
 * text slides over it on a phone or beside it on a wide screen. It ends on
 * the reading's last line; then, apart, their Sun takes their questions.
 */
export function ReadingStory({
    reading,
    content,
    notice,
    account,
    chat,
    door,
}: {
    reading: Reading;
    /** The full reading; without it, the free preview up to `door`. */
    content?: string;
    /** On the cover, e.g. "save it": it only lives in this browser. */
    notice?: ReactNode;
    /** Below the chat: "save it in an account". */
    account?: ReactNode;
    chat?: ReactNode;
    /** The preview's last box: unlock the reading, or it's being written. */
    door?: ReactNode;
}) {
    const story = useMemo(
        () =>
            content
                ? buildStory({
                      topic: reading.topic,
                      teaser: reading.teaser,
                      content,
                      chart: reading.chart,
                      question: reading.question,
                      skyAhead: reading.skyAhead,
                      facts: reading.facts,
                  })
                : previewStory({
                      topic: reading.topic,
                      teaser: reading.teaser,
                      chart: reading.chart,
                      question: reading.question,
                      skyAhead: reading.skyAhead,
                      facts: reading.facts,
                  }),
        [reading, content],
    );
    // -1 is the cover.
    const [active, setActive] = useState(COVER_STEP);
    const stepRefs = useRef<(HTMLElement | null)[]>([]);
    const coverRef = useRef<HTMLElement>(null);
    const storyRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: storyRef,
        offset: ["start start", "end end"],
    });
    const progress = useSpring(scrollYProgress, {
        stiffness: 120,
        damping: 30,
    });

    // Just bought: the story may land after the "being written" screen,
    // when the browser already gave up on the #sigue it came with.
    useEffect(() => {
        if (content && window.location.hash === `#${CONTINUE_ANCHOR}`) {
            document.getElementById(CONTINUE_ANCHOR)?.scrollIntoView();
        }
    }, [content]);

    // Once the chat is on screen, "Ir al chat" has nothing left to do. The
    // chat may arrive later, with the paid text, on a page already open.
    const [inChat, setInChat] = useState(false);
    const hasChat = Boolean(chat);
    useEffect(() => {
        const room = hasChat && document.getElementById(CHAT_ANCHOR);
        if (!room) return;
        const observer = new IntersectionObserver(
            ([entry]) => setInChat(entry.isIntersecting),
            { threshold: 0.15 },
        );
        observer.observe(room);
        return () => observer.disconnect();
    }, [hasChat]);

    // The step on the middle of the screen owns the stage. Watched afresh
    // when the steps change: once paid, they arrive on a page already open.
    useEffect(() => {
        const steps = [
            coverRef.current,
            ...stepRefs.current.slice(0, story.steps.length),
        ].filter((el) => el !== null);
        const observer = new IntersectionObserver(
            () => {
                // Asked of the page, not of the entries: a fast scroll
                // reports several at once, in no useful order.
                const middle = window.innerHeight / 2;
                const at = steps.find((el) => {
                    const { top, bottom } = el.getBoundingClientRect();
                    return top <= middle && bottom > middle;
                });
                const index = Number(at?.dataset.step);
                if (at && !Number.isNaN(index)) setActive(index);
            },
            { rootMargin: "-50% 0px -50% 0px" },
        );
        for (const el of steps) observer.observe(el);
        return () => observer.disconnect();
    }, [story]);

    // On a phone the scene has the top half and the text the bottom one:
    // text pushed up dissolves line by line before it reaches the drawing,
    // like the chat's history under its Sun. Read once per frame, then
    // written; the door keeps its cut and its box whole, by the button.
    useEffect(() => {
        const phone = window.matchMedia("(max-width: 1023px)");
        const texts = [
            coverRef.current,
            ...stepRefs.current.slice(0, story.steps.length),
        ]
            .filter((el) => el !== null)
            .flatMap((el) =>
                el.dataset.whole
                    ? [...el.querySelectorAll<HTMLElement>("[data-fades]")]
                    : [el],
            );
        const mask = (el: HTMLElement, value: string) => {
            if (el.style.maskImage === value) return;
            el.style.maskImage = value;
            el.style.setProperty("-webkit-mask-image", value);
        };
        let frame = 0;
        const paint = () => {
            frame = 0;
            if (!phone.matches) {
                for (const el of texts) mask(el, "");
                return;
            }
            const height = window.innerHeight;
            const boxes = texts.map((el) => el.getBoundingClientRect());
            texts.forEach((el, i) => {
                const box = boxes[i];
                const gone = FADE[0] * height - box.top;
                const whole = FADE[1] * height - box.top;
                if (box.bottom < 0 || box.top > height || whole <= 0)
                    mask(el, "");
                else if (gone >= box.height)
                    mask(el, "linear-gradient(transparent, transparent)");
                else
                    mask(
                        el,
                        `linear-gradient(to bottom, transparent ${gone}px, black ${whole}px)`,
                    );
            });
        };
        const later = () => {
            if (!frame) frame = requestAnimationFrame(paint);
        };
        paint();
        window.addEventListener("scroll", later, { passive: true });
        window.addEventListener("resize", later);
        phone.addEventListener("change", later);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("scroll", later);
            window.removeEventListener("resize", later);
            phone.removeEventListener("change", later);
        };
    }, [story]);

    // How far they read: each step reached for the first time, the door
    // (where the free part stops) and, once paid, the end.
    const paid = Boolean(content);
    const furthest = useRef(COVER_STEP);
    const doorAt = useRef<number | null>(null);
    /** When the current step showed up: how long the previous one held them. */
    const stepAt = useRef(Date.now());
    useEffect(() => {
        furthest.current = COVER_STEP;
        stepAt.current = Date.now();
        track("reading_view", { paid, steps: story.steps.length }, reading.id);
    }, [story, paid, reading.id]);
    useEffect(() => {
        if (active <= furthest.current) return;
        // A step that takes long is where the reading drags before the door.
        const seconds = Math.round((Date.now() - stepAt.current) / 1000);
        stepAt.current = Date.now();
        furthest.current = active;
        const reached = story.steps[active];
        const props = { step: active + 1, of: story.steps.length, paid };
        track(
            "story_step",
            { ...props, kind: reached?.kind ?? null, seconds },
            reading.id,
        );
        if (reached?.kind === "door") {
            if (!paid) doorAt.current ??= Date.now();
            // The price is what the door shows: the funnel splits by it.
            track(
                "paywall_view",
                {
                    ...props,
                    price: OFFER.priceAmount,
                    currency: OFFER.currency,
                },
                reading.id,
            );
            // The price, seen: where the free part stops.
            if (!paid) metaEventOnce("ViewContent", READING_VALUE, reading.id);
        }
        if (paid && active === story.steps.length - 1)
            track("story_end", props, reading.id);
    }, [active, story, paid, reading.id]);

    // The most common exit: the price was read and the tab closed before
    // paying. Sent while the page goes away, so it must leave at once.
    useEffect(() => {
        if (paid) return;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let sent = false;
        const leave = (reason: "pagehide" | "hidden") => {
            if (sent || checkoutStarted(reading.id)) return;
            const door = doorAt.current;
            if (door === null) return;
            sent = true;
            const button = paywallButtonSeenAt(reading.id);
            track(
                "paywall_exit",
                {
                    // On the button when it was seen, otherwise on the price.
                    seconds: Math.round((Date.now() - (button ?? door)) / 1000),
                    door_seconds: Math.round((Date.now() - door) / 1000),
                    button_seen: button !== null,
                    step: furthest.current + 1,
                    of: story.steps.length,
                    reason,
                },
                reading.id,
                { instant: true },
            );
            flush();
        };
        const onVisibility = () => {
            if (document.visibilityState !== "hidden") {
                if (timer) {
                    clearTimeout(timer);
                    timer = undefined;
                }
                return;
            }
            // Mobile can kill a hidden tab without `pagehide`: a short grace
            // period catches it without counting a quick tab switch.
            timer = setTimeout(() => leave("hidden"), 1000);
        };
        const onPageHide = () => {
            if (timer) clearTimeout(timer);
            leave("pagehide");
        };
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("pagehide", onPageHide);
        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("pagehide", onPageHide);
            if (timer) clearTimeout(timer);
        };
    }, [paid, reading.id, story.steps.length]);

    const step = story.steps[active] ?? COVER;
    const chapter = step.chapter === null ? null : story.chapters[step.chapter];

    return (
        <MotionConfig reducedMotion="user">
            <div className="theme-astral relative bg-background text-foreground">
                <Starfield />

                {/* The paid story comes in softly: a screen stood here while it was written. */}
                <header
                    className={cn(
                        "fixed inset-x-0 top-0 z-30",
                        content && "animate-fade-in",
                    )}
                >
                    <motion.div
                        aria-hidden
                        className="h-0.5 origin-left bg-astral-gold"
                        style={{ scaleX: progress }}
                    />
                    <nav className="flex items-center justify-between gap-3 bg-gradient-to-b from-background/90 to-transparent px-4 pt-3 pb-6 sm:px-6">
                        <Link href="/" aria-label="Astramia, inicio">
                            <AstramiaLogo className="scale-90 max-sm:[&>span]:hidden" />
                        </Link>
                        <AnimatePresence mode="wait">
                            {chapter && !inChat && (
                                <motion.p
                                    key={chapter.numeral}
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 4 }}
                                    className="truncate font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]"
                                >
                                    {chapter.numeral} · {chapter.label}
                                </motion.p>
                            )}
                        </AnimatePresence>
                        <AnimatePresence initial={false}>
                            {chat && !inChat && (
                                <motion.a
                                    href={`#${CHAT_ANCHOR}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="shrink-0 rounded-full border border-astral-gold/40 px-3 py-1.5 font-mono text-[11px] text-astral-gold uppercase tracking-[0.16em] hover:bg-astral-gold/10"
                                >
                                    Ir al chat
                                </motion.a>
                            )}
                        </AnimatePresence>
                    </nav>
                </header>

                <section
                    ref={storyRef}
                    aria-label="Tu lectura"
                    className={cn(
                        "relative z-10 lg:grid lg:grid-cols-2",
                        content && "animate-fade-in",
                    )}
                >
                    <div className="sticky top-0 h-svh overflow-hidden lg:self-start">
                        {/* On a phone the bottom half is the text's. */}
                        <div className="absolute inset-x-0 top-0 h-[50svh] pt-12 lg:inset-0 lg:h-auto lg:pt-0">
                            <StoryStage
                                visual={step.visual}
                                chart={reading.chart}
                                born={shortDate(reading.birthDate)}
                            />
                        </div>
                        {/* Keeps text legible where it slides over the scene. */}
                        <div
                            aria-hidden
                            className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background via-background/70 to-transparent lg:hidden"
                        />
                    </div>

                    <div className="relative -mt-[100svh] px-5 sm:px-8 lg:mt-0 lg:px-14 xl:px-20">
                        <article
                            ref={coverRef}
                            data-step={COVER_STEP}
                            // On a phone it starts under the drawing, whatever
                            // the screen's height: grown up from the bottom, a
                            // short screen pushed it into the image.
                            className="ph-mask flex min-h-[100svh] flex-col gap-4 pt-[52svh] pb-[6svh] lg:justify-center lg:gap-6 lg:pt-0 lg:pb-0"
                        >
                            <motion.div
                                {...ENTER}
                                className="flex flex-col gap-4"
                            >
                                <p className="font-mono text-[11px] text-astral-gold uppercase tracking-[0.24em]">
                                    Tu lectura {planFor(reading.topic).of} ·{" "}
                                    {reading.sunSign}
                                </p>
                                <h1 className="text-balance font-display text-4xl leading-[1.02] sm:text-6xl lg:text-7xl">
                                    {COVER_COPY[reading.topic].title}
                                </h1>
                                <p className="max-w-md text-pretty text-base text-muted-foreground sm:text-lg">
                                    Así estaba el cielo el{" "}
                                    {longDate(reading.birthDate)}.{" "}
                                    {COVER_COPY[reading.topic].story}
                                </p>
                                <p className="max-w-md text-pretty font-mono text-[11px] text-muted-foreground uppercase leading-relaxed tracking-[0.14em]">
                                    {computedFrom(reading)}
                                </p>
                            </motion.div>
                            <ScrollCue />
                            {notice}
                        </article>

                        {story.steps.map((s, i) => (
                            <article
                                // Steps are fixed for a given text: order is their identity.
                                key={i}
                                id={
                                    content && i === story.continueAt
                                        ? CONTINUE_ANCHOR
                                        : undefined
                                }
                                ref={(el) => {
                                    stepRefs.current[i] = el;
                                }}
                                data-step={i}
                                data-whole={
                                    s.kind === "door" ? true : undefined
                                }
                                className={cn(
                                    "flex flex-col justify-end pb-[10svh] lg:justify-center lg:pb-0",
                                    stepHeight(s),
                                    // On a phone the door's text starts under
                                    // the image (both in sight), the box a
                                    // scroll below.
                                    s.kind === "door" &&
                                        "max-lg:justify-start max-lg:pt-[56svh]",
                                    // The door itself (price, button, trust
                                    // copy) stays readable in replays; the
                                    // story and the quiz don't.
                                    s.kind !== "door" && "ph-mask",
                                )}
                            >
                                <StepContent step={s} door={door} />
                            </article>
                        ))}
                    </div>
                </section>

                {chat && (
                    <section
                        id={CHAT_ANCHOR}
                        aria-label="Chat sobre tu lectura"
                        className="ph-mask relative z-10"
                    >
                        {chat}
                    </section>
                )}

                {/* After the chat: the story and the Sun come first. */}
                {account && (
                    <div className="relative z-10 mx-auto max-w-2xl px-5 pt-6 pb-16 sm:px-8">
                        {account}
                    </div>
                )}
            </div>
        </MotionConfig>
    );
}

function ScrollCue() {
    return (
        <div
            aria-hidden
            className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]"
        >
            <span className="relative h-10 w-px overflow-hidden bg-astral-ink">
                <motion.span
                    className="absolute inset-x-0 top-0 h-1/2 bg-astral-gold"
                    animate={{ y: ["-100%", "200%"] }}
                    transition={{
                        duration: 1.8,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                    }}
                />
            </span>
            Desliza para empezar
        </div>
    );
}
