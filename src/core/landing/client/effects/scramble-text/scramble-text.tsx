"use client";

import { useInView, useReducedMotion } from "motion/react";
import { Fragment, useEffect, useRef, useState } from "react";
import { cn } from "@/frontend/lib/utils";
import styles from "./scramble-text.module.css";

// Each glyph carries U+FE0E so platforms never swap in an emoji.
const GLYPHS = Array.from("♈♉♊♋♌♍♎♏♐♑♒♓☉☾☿♀♂♃♄·").map(
    (g) => `${g}︎`,
);

interface ScrambleTextProps {
    text: string;
    className?: string;
    /** Seconds before the decode starts once in view. */
    delay?: number;
    /** Total decode time in seconds. */
    duration?: number;
}

/**
 * Decodes a headline out of zodiac and planet glyphs once it scrolls into
 * view. Screen readers get the plain text; the animated copy is aria-hidden.
 *
 * Layout never moves: every letter is laid out as itself (invisible while
 * unresolved) and its glyph is painted over it, out of flow. Glyphs are wider
 * and come from a fallback font, so typing them inline re-wrapped the line and
 * pushed everything below up and down until the text settled.
 */
export function ScrambleText({
    text,
    className,
    delay = 0,
    duration = 1.4,
}: ScrambleTextProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, margin: "-10% 0px" });
    const reducedMotion = useReducedMotion();
    /** Per character: the glyph covering it, or null once it reads as itself. */
    const [cover, setCover] = useState<(string | null)[] | null>(null);

    useEffect(() => {
        if (!inView || reducedMotion) return;
        let frame = 0;
        let start = 0;
        let lastPaint = 0;
        /** The decode is rough on purpose; 16 fps is plenty and spares phones. */
        const PAINT_MS = 64;
        const chars = Array.from(text);
        const total = chars.length;
        const randomGlyph = () =>
            GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

        const tick = (now: number) => {
            if (now - lastPaint < PAINT_MS) {
                frame = requestAnimationFrame(tick);
                return;
            }
            lastPaint = now;
            if (!start) start = now + delay * 1000;
            const elapsed = (now - start) / 1000;
            if (elapsed < 0) {
                setCover(chars.map((c) => (c === " " ? null : "·")));
                frame = requestAnimationFrame(tick);
                return;
            }
            const progress = Math.min(elapsed / duration, 1);
            if (progress >= 1) {
                setCover(null);
                return;
            }
            setCover(
                chars.map((char, i) =>
                    // Characters resolve left to right.
                    char === " " || progress >= (i / total) * 0.85
                        ? null
                        : randomGlyph(),
                ),
            );
            frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [inView, reducedMotion, text, delay, duration]);

    return (
        <span ref={ref} className={className}>
            <span className="sr-only">{text}</span>
            <span aria-hidden className={cn(cover && styles.running)}>
                {cover ? <Covered text={text} cover={cover} /> : text}
            </span>
        </span>
    );
}

/** Words stay unbreakable so lines wrap exactly where the final text does. */
function Covered({ text, cover }: { text: string; cover: (string | null)[] }) {
    let index = 0;
    return text.split(" ").map((word, w) => {
        const letters = Array.from(word).map((char) => {
            const glyph = cover[index++];
            return glyph ? (
                <span key={index} className={styles.cell}>
                    {char}
                    <span className={styles.glyph}>{glyph}</span>
                </span>
            ) : (
                <Fragment key={index}>{char}</Fragment>
            );
        });
        index++; // the space
        return (
            <Fragment key={`${w}-${word}`}>
                {w > 0 && " "}
                <span className={styles.word}>{letters}</span>
            </Fragment>
        );
    });
}
