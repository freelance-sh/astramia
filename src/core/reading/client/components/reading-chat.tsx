"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/core/analytics/client/track";
import { CHAT_LIMITS } from "@/core/reading/domain/schemas";
import type { ChatMessage, ReadingTopic } from "@/core/reading/domain/types";
import { Button } from "@/frontend/components/ui/button";
import { Textarea } from "@/frontend/components/ui/textarea";
import { cn } from "@/frontend/lib/utils";
import { Globe } from "../story/globe";
import { renderInline } from "./reading-text";

function toUIMessage(message: ChatMessage): UIMessage {
    return {
        id: message.id,
        role: message.role,
        parts: [{ type: "text", text: message.content }],
    };
}

function textOf(message: UIMessage): string {
    return message.parts
        .map((part) => (part.type === "text" ? part.text : ""))
        .join("");
}

const HOUR_MS = 60 * 60 * 1000;

/** A blank box is the hardest part: a few first questions to tap. */
const SUGGESTIONS: Record<ReadingTopic, readonly string[]> = {
    amor: [
        "¿Por qué me pasa siempre lo mismo?",
        "¿Qué hago esta semana con lo que siento?",
        "Explícame mejor mi Venus",
        "¿Cómo sé si alguien me conviene?",
    ],
    compatibilidad: [
        "¿Qué hago cuando chocamos?",
        "¿Cómo le digo lo que necesito?",
        "¿Qué le cuesta a esa persona de mí?",
        "¿Qué cuidamos primero?",
    ],
    personalidad: [
        "¿Por qué me cuesta tanto mostrarme?",
        "Explícame mejor mi Ascendente",
        "¿En qué trabajo brillaría?",
        "¿Qué hago con lo que me frena?",
    ],
    camino: [
        "¿Qué hago este mes?",
        "¿Cuándo es buen momento para decidir?",
        "Explícame mejor lo de Saturno",
        "¿Qué suelto y qué sostengo?",
    ],
};

/**
 * Formatted after mount: the server doesn't know the visitor's time zone, and
 * formatting there (UTC on Vercel) would not match the browser's hydration.
 */
function useLocalTime(iso: string | null): string | null {
    const [time, setTime] = useState<string | null>(null);
    useEffect(() => {
        setTime(
            iso
                ? new Date(iso).toLocaleTimeString("es-PE", {
                      hour: "2-digit",
                      minute: "2-digit",
                  })
                : null,
        );
    }, [iso]);
    return time;
}

/** "Tu Sol está pensando" with its dots coming and going: . .. ... */
function Thinking() {
    const reducedMotion = useReducedMotion();
    const [dots, setDots] = useState(3);
    useEffect(() => {
        if (reducedMotion) return;
        const timer = window.setInterval(
            () => setDots((d) => (d % 3) + 1),
            420,
        );
        return () => window.clearInterval(timer);
    }, [reducedMotion]);
    return (
        <span>
            Tu Sol está pensando
            {/* Fixed width: the line doesn't twitch as dots come and go. */}
            <span className="inline-block w-[3ch] text-left">
                {".".repeat(dots)}
            </span>
        </span>
    );
}

/**
 * A reply as it streams: each new word fades in from a soft blur; words
 * already shown keep their place (keyed by position), so nothing replays.
 */
function FlowingText({ text }: { text: string }) {
    let position = 0;
    return text.split(/(\*\*[^*]+\*\*)/).map((part, p) => {
        const bold = part.startsWith("**") && part.endsWith("**");
        const words = (bold ? part.slice(2, -2) : part.replace(/\*/g, ""))
            .split(/(\s+)/)
            .map((word) => {
                const key = position++;
                return /^\s*$/.test(word) ? (
                    word
                ) : (
                    <span key={key} className="animate-word-in">
                        {word}
                    </span>
                );
            });
        // Parts only grow at the end: their position is their identity.
        return bold ? <strong key={p}>{words}</strong> : words;
    });
}

/**
 * Their Sun, the one that rose at the end of the story. It breathes while
 * waiting and burns brighter while it answers.
 */
function Sun({
    speaking,
    className,
}: {
    speaking: boolean;
    className?: string;
}) {
    const reducedMotion = useReducedMotion();
    return (
        <div aria-hidden className={cn("relative", className)}>
            <motion.div
                className="absolute inset-[-55%] rounded-full blur-2xl max-lg:blur-xl"
                style={{
                    background:
                        "radial-gradient(circle, oklch(0.82 0.16 70 / 55%), transparent 65%)",
                }}
                animate={
                    reducedMotion
                        ? undefined
                        : speaking
                          ? { opacity: [0.7, 1, 0.7], scale: [1, 1.12, 1] }
                          : { opacity: [0.45, 0.7, 0.45], scale: [1, 1.04, 1] }
                }
                transition={{
                    duration: speaking ? 1.4 : 5,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                }}
            />
            <motion.div
                className="absolute inset-[-30%] rounded-full opacity-70 blur-[3px]"
                style={{
                    background:
                        "repeating-conic-gradient(from 0deg, oklch(0.88 0.14 80 / 55%) 0deg 4deg, transparent 4deg 15deg)",
                    maskImage:
                        "radial-gradient(circle, black 35%, transparent 70%)",
                }}
                animate={reducedMotion ? undefined : { rotate: 360 }}
                transition={{
                    duration: speaking ? 20 : 90,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                }}
            />
            <div
                className="relative size-full rounded-full"
                style={{
                    background:
                        "radial-gradient(circle at 40% 36%, #fffbe8 0%, #ffd66b 30%, #f2a531 64%, #c8641a 100%)",
                    boxShadow: "inset -10px -12px 30px rgb(120 40 0 / 35%)",
                }}
            />
        </div>
    );
}

/** Their Sun, real-looking, glowing harder while it answers. */
function SpeakingSun({ speaking }: { speaking: boolean }) {
    const reducedMotion = useReducedMotion();
    return (
        <div aria-hidden className="relative size-40 sm:size-52">
            <motion.div
                className="absolute inset-[22%] rounded-full blur-2xl max-lg:blur-xl"
                style={{
                    background:
                        "radial-gradient(circle, oklch(0.82 0.16 70 / 55%), transparent 65%)",
                }}
                animate={
                    reducedMotion
                        ? undefined
                        : speaking
                          ? { opacity: [0.6, 1, 0.6], scale: [1, 1.15, 1] }
                          : { opacity: 0.45, scale: 1 }
                }
                transition={{
                    duration: 1.4,
                    repeat: speaking ? Number.POSITIVE_INFINITY : 0,
                    ease: "easeInOut",
                }}
            />
            <Globe
                body="Sol"
                className="relative size-full"
                fallback={
                    <Sun speaking={speaking} className="absolute inset-[28%]" />
                }
            />
        </div>
    );
}

/**
 * Chat about the reading, as the story's last chapter: their Sun answers.
 * History lives on the server, so the request only carries the new question
 * (`{ text }`), validated by `chatTurnSchema`.
 */
export function ReadingChat({
    readingId,
    initialMessages,
    expiresAt,
    sunSign,
    topic = "amor",
    demo = false,
}: {
    readingId: string;
    initialMessages: ChatMessage[];
    /** `null` until the first question: that's when the hours start. */
    expiresAt: string | null;
    sunSign: string;
    /** Which reading it is: what the first questions offered are about. */
    topic?: ReadingTopic;
    /** The /lectura/ejemplo preview: shows the chat, never sends. */
    demo?: boolean;
}) {
    const reducedMotion = useReducedMotion();
    const [input, setInput] = useState("");
    const [openUntil, setOpenUntil] = useState(expiresAt);
    const [demoNote, setDemoNote] = useState(false);
    const transport = useMemo(
        () =>
            new DefaultChatTransport<UIMessage>({
                api: `/api/v1/readings/${readingId}/chat`,
                prepareSendMessagesRequest: ({ messages }) => ({
                    body: { text: textOf(messages[messages.length - 1]) },
                }),
            }),
        [readingId],
    );
    // Replies from earlier visits are shown still; only new ones flow in.
    const [initialIds] = useState(
        () => new Set(initialMessages.map((m) => m.id)),
    );
    const { messages, sendMessage, status, error } = useChat({
        messages: initialMessages.map(toUIMessage),
        transport,
    });

    const asked = messages.filter((m) => m.role === "user").length;
    const expired =
        openUntil !== null && new Date(openUntil).getTime() < Date.now();
    const exhausted = asked >= CHAT_LIMITS.maxUserMessages;
    const busy = status === "submitted" || status === "streaming";
    const closed = expired || exhausted;

    // The chat is a room the size of the screen: the Sun stays at the top
    // and the conversation scrolls under it, inside.
    const roomRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    // Until the room fills the screen, a swipe moves the page, not the list.
    const [inRoom, setInRoom] = useState(false);
    useEffect(() => {
        const room = roomRef.current;
        if (!room) return;
        const observer = new IntersectionObserver(
            ([entry]) => setInRoom(entry.intersectionRatio > 0.97),
            { threshold: [0, 0.5, 0.97, 1] },
        );
        observer.observe(room);
        return () => observer.disconnect();
    }, []);
    // Seen once a visit: how many reach the Sun, against how many ask it.
    const seen = useRef(false);
    useEffect(() => {
        if (!inRoom || seen.current) return;
        seen.current = true;
        track("chat_view", { asked, open: !closed }, readingId);
    }, [inRoom, asked, closed, readingId]);
    useEffect(() => {
        if (error)
            track(
                "chat_error",
                { message: error.message.slice(0, 200) },
                readingId,
            );
    }, [error, readingId]);

    // Once they ask, the list follows the answer as it's written, until
    // they scroll back up to reread something.
    const following = useRef(false);
    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        let last = list.scrollTop;
        const onScroll = () => {
            if (list.scrollTop < last - 4) following.current = false;
            last = list.scrollTop;
        };
        list.addEventListener("scroll", onScroll, { passive: true });
        return () => list.removeEventListener("scroll", onScroll);
    }, []);
    // biome-ignore lint/correctness/useExhaustiveDependencies: runs on every new word and status, which is the point.
    useEffect(() => {
        const list = listRef.current;
        if (following.current && list) list.scrollTop = list.scrollHeight;
    }, [messages, status]);

    function ask(question: string) {
        const text = question.trim();
        if (!text || busy || closed) return;
        if (demo) {
            setDemoNote(true);
            return;
        }
        // The server opens the same window with this question.
        if (!openUntil)
            setOpenUntil(
                new Date(
                    Date.now() + CHAT_LIMITS.hours * HOUR_MS,
                ).toISOString(),
            );
        following.current = true;
        roomRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
        track("chat_send", { chars: text.length, turn: asked + 1 }, readingId);
        sendMessage({ text });
        setInput("");
    }

    const closesAt = useLocalTime(openUntil);

    return (
        <div ref={roomRef} className="relative flex h-svh flex-col">
            <div className="flex shrink-0 justify-center pt-12">
                {/* The night is over: their Sun rises, and stays. */}
                <motion.div
                    initial={reducedMotion ? false : { opacity: 0, y: 80 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 2, ease: [0.2, 0.7, 0.2, 1] }}
                    className="-mb-8"
                >
                    <SpeakingSun speaking={busy} />
                </motion.div>
            </div>
            <div
                ref={listRef}
                className={cn(
                    "min-h-0 flex-1 px-5 [scrollbar-gutter:stable] [scrollbar-width:thin] sm:px-8",
                    inRoom ? "overflow-y-auto" : "overflow-y-hidden",
                )}
                style={{
                    // Words fade into the Sun's sky as they scroll up.
                    maskImage:
                        "linear-gradient(to bottom, transparent, black 88px, black calc(100% - 20px), transparent)",
                }}
            >
                <div className="mx-auto flex max-w-2xl flex-col gap-10 pt-14 pb-8">
                    <header className="flex flex-col items-center gap-3 text-center">
                        <p className="font-mono text-[11px] text-astral-gold uppercase tracking-[0.24em]">
                            Ahora, tú preguntas
                        </p>
                        <h2 className="text-balance font-display text-5xl leading-[1.02] sm:text-6xl">
                            Tu Sol en {sunSign} te escucha
                        </h2>
                        <p className="mx-auto max-w-md text-pretty text-lg text-muted-foreground">
                            La misma voz que escribió tu lectura. Pregúntale lo
                            que quieras sobre ella.
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
                            {expired
                                ? "Chat cerrado"
                                : !openUntil
                                  ? `${CHAT_LIMITS.hours} horas desde tu primera pregunta`
                                  : closesAt
                                    ? `Abierto hasta las ${closesAt}`
                                    : "Chat abierto"}
                        </p>
                    </header>

                    {messages.length > 0 && (
                        <ol className="flex flex-col gap-6">
                            {messages.map((message) =>
                                message.role === "assistant" ? (
                                    <motion.li
                                        key={message.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex gap-3"
                                    >
                                        <Sun
                                            speaking={false}
                                            className="mt-2 size-3 shrink-0"
                                        />
                                        <p className="whitespace-pre-wrap text-pretty text-lg leading-relaxed">
                                            {initialIds.has(message.id) ? (
                                                renderInline(textOf(message))
                                            ) : (
                                                <FlowingText
                                                    text={textOf(message)}
                                                />
                                            )}
                                        </p>
                                    </motion.li>
                                ) : (
                                    <li
                                        key={message.id}
                                        className="max-w-[85%] self-end whitespace-pre-wrap rounded-2xl rounded-br-sm bg-astral-gold/15 px-4 py-3 leading-relaxed"
                                    >
                                        {textOf(message)}
                                    </li>
                                ),
                            )}
                            {status === "submitted" && (
                                <li className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
                                    <Sun speaking className="size-3" />
                                    <Thinking />
                                </li>
                            )}
                        </ol>
                    )}

                    {error && (
                        <p role="alert" className="text-destructive text-sm">
                            No pudimos responder ahora. Inténtalo otra vez.
                        </p>
                    )}

                    {closed && (
                        <p className="text-center text-muted-foreground">
                            {expired
                                ? "Tus horas de chat terminaron. Tu lectura sigue aquí cuando quieras volver."
                                : "Llegaste al límite de preguntas de esta lectura."}
                        </p>
                    )}

                    {!closed && asked === 0 && (
                        <ul
                            aria-label="Preguntas para empezar"
                            className="flex flex-wrap justify-center gap-2"
                        >
                            {SUGGESTIONS[topic].map((question) => (
                                <li key={question}>
                                    <button
                                        type="button"
                                        onClick={() => ask(question)}
                                        disabled={busy}
                                        className="rounded-full border border-astral-gold/30 bg-background/40 px-4 py-2 text-sm transition-colors hover:border-astral-gold hover:bg-astral-gold/10"
                                    >
                                        {question}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {!closed && (
                <div className="shrink-0 px-5 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:px-8">
                    <div className="mx-auto flex max-w-2xl flex-col gap-3">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                ask(input);
                            }}
                            className="flex items-end gap-2 rounded-3xl border border-astral-gold/30 bg-background/60 p-2 backdrop-blur-md focus-within:border-astral-gold max-lg:backdrop-blur-none"
                        >
                            <Textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        ask(input);
                                    }
                                }}
                                maxLength={CHAT_LIMITS.maxMessageChars}
                                placeholder="Escríbele a tu Sol…"
                                aria-label="Tu pregunta"
                                className="min-h-11 resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={busy || !input.trim()}
                                aria-label="Enviar"
                                className="size-11 shrink-0 rounded-full"
                            >
                                <ArrowUp />
                            </Button>
                        </form>
                        {demoNote && (
                            <p
                                role="status"
                                className="text-center text-muted-foreground text-sm"
                            >
                                Esto es un ejemplo: aquí el Sol no responde. En
                                tu lectura, sí.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
