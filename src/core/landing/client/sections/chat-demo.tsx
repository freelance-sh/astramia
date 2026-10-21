"use client";

import {
    AnimatePresence,
    motion,
    useInView,
    useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/frontend/components/ui/card";
import { cn } from "@/frontend/lib/utils";
import {
    type ChatMessage,
    DEMO_CHAT,
    DEMO_CONTEXT,
    OFFER,
} from "../../domain/content";

const SESSION_SECONDS = OFFER.chatHours * 3600;
// Demo starts as if a few minutes of the session were already used.
const DEMO_ELAPSED_SECONDS = 754;

function formatRemaining(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Human-ish typing cadence: slower after punctuation, a little jitter. */
function cadence(char: string) {
    const base = 16 + Math.random() * 22;
    if (char === "." || char === "?" || char === ":") return base + 240;
    if (char === "," || char === ";") return base + 110;
    return base;
}

/**
 * Scripted chat that plays once when scrolled into view. User turns arrive
 * whole; the assistant types character by character after a short pause.
 */
export function ChatDemo() {
    const ref = useRef<HTMLDivElement>(null);
    const logRef = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-120px" });
    const reducedMotion = useReducedMotion();
    const [shown, setShown] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState<string | null>(null);
    const [typing, setTyping] = useState(false);
    const [remaining, setRemaining] = useState(
        SESSION_SECONDS - DEMO_ELAPSED_SECONDS,
    );

    useEffect(() => {
        if (!inView) return;
        if (reducedMotion) {
            setShown(DEMO_CHAT);
            return;
        }
        let cancelled = false;
        const timers: number[] = [];
        const wait = (ms: number) =>
            new Promise<void>((resolve) => {
                timers.push(window.setTimeout(resolve, ms));
            });

        (async () => {
            for (const message of DEMO_CHAT) {
                if (cancelled) return;
                if (message.from === "user") {
                    await wait(900);
                    if (cancelled) return;
                    setShown((s) => [...s, message]);
                    continue;
                }
                await wait(700);
                if (cancelled) return;
                setTyping(true);
                await wait(1100);
                if (cancelled) return;
                setTyping(false);
                let out = "";
                for (const char of Array.from(message.text)) {
                    if (cancelled) return;
                    out += char;
                    setDraft(out);
                    await wait(cadence(char));
                }
                setDraft(null);
                setShown((s) => [...s, message]);
                await wait(600);
            }
        })();

        return () => {
            cancelled = true;
            for (const t of timers) window.clearTimeout(t);
        };
    }, [inView, reducedMotion]);

    useEffect(() => {
        if (!inView) return;
        const timer = window.setInterval(
            () => setRemaining((s) => Math.max(s - 1, 0)),
            1000,
        );
        return () => window.clearInterval(timer);
    }, [inView]);

    // Keep the newest line in view while the assistant types.
    // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on every content change
    useEffect(() => {
        const log = logRef.current;
        if (log) log.scrollTop = log.scrollHeight;
    }, [shown, draft, typing]);

    const progress = remaining / SESSION_SECONDS;

    return (
        <Card
            ref={ref}
            className="gap-0 overflow-hidden border-astral-ink bg-card/70 py-0 backdrop-blur-xl max-lg:backdrop-blur-none"
        >
            <CardHeader className="flex flex-row items-center justify-between gap-4 border-astral-ink border-b py-4">
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        aria-hidden
                        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-astral-gold/40 bg-astral-gold/10 font-display text-astral-gold text-lg"
                    >
                        {"\u2609\uFE0E"}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate font-medium text-sm">Tu Sol</p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {DEMO_CONTEXT.sun} · {DEMO_CONTEXT.venus}
                        </p>
                    </div>
                </div>
                <div className="shrink-0 text-right">
                    <p className="font-mono text-astral-gold text-sm tabular-nums">
                        {formatRemaining(remaining)}
                    </p>
                    <div className="mt-1 h-px w-24 overflow-hidden bg-muted">
                        <div
                            className="h-full bg-astral-gold"
                            style={{ width: `${progress * 100}%` }}
                        />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <div
                    ref={logRef}
                    className="flex max-h-[26rem] min-h-[22rem] flex-col gap-3 overflow-y-auto p-5 [scrollbar-width:thin]"
                >
                    <div aria-live="polite" className="contents">
                        <AnimatePresence initial={false}>
                            {shown.map((message) => (
                                <motion.div
                                    key={message.text}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: 0.35,
                                        ease: [0.22, 1, 0.36, 1],
                                    }}
                                    className={cn(
                                        "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                                        message.from === "user"
                                            ? "self-end rounded-br-sm bg-astral-violet/25 text-foreground"
                                            : "self-start rounded-bl-sm border border-astral-ink bg-secondary",
                                    )}
                                >
                                    {message.text}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                    {draft !== null && (
                        <div
                            aria-hidden
                            className="max-w-[88%] self-start rounded-2xl rounded-bl-sm border border-astral-ink bg-secondary px-4 py-3 text-sm leading-relaxed"
                        >
                            {draft}
                            <span className="ml-0.5 inline-block h-[1em] w-px translate-y-[2px] animate-pulse bg-astral-gold align-baseline" />
                        </div>
                    )}
                    {typing && (
                        <output
                            className="flex w-fit gap-1 rounded-2xl rounded-bl-sm border border-astral-ink bg-secondary px-4 py-3"
                            aria-label="Tu Sol está escribiendo"
                        >
                            {[0, 1, 2].map((dot) => (
                                <span
                                    key={dot}
                                    className="size-1.5 animate-bounce rounded-full bg-astral-gold"
                                    style={{ animationDelay: `${dot * 150}ms` }}
                                />
                            ))}
                        </output>
                    )}
                </div>
                <div className="flex items-center gap-3 border-astral-ink border-t px-5 py-3 font-mono text-[11px] text-muted-foreground/70">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    Conectado a tu lectura · nada de esto se comparte
                </div>
            </CardContent>
        </Card>
    );
}
