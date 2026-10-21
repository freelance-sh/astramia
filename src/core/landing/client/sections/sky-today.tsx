"use client";

import { useEffect, useState } from "react";
import { cn } from "@/frontend/lib/utils";
import { OFFER } from "../../domain/content";
import { getSkySnapshot, type SkySnapshot } from "../../domain/ephemeris";
import { formatDegree } from "../../domain/zodiac";
import { Marquee, MoonDisc } from "../effects";

/** Computed on the client after mount so SSR output never depends on time. */
function useSkySnapshot() {
    const [snapshot, setSnapshot] = useState<SkySnapshot | null>(null);
    useEffect(() => {
        setSnapshot(getSkySnapshot(new Date()));
        const timer = window.setInterval(
            () => setSnapshot(getSkySnapshot(new Date())),
            60_000,
        );
        return () => window.clearInterval(timer);
    }, []);
    return snapshot;
}

const DATE_FORMAT = new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
});

function Body({
    glyph,
    name,
    position,
}: {
    glyph: string;
    name: string;
    position: SkySnapshot["sun"]["position"];
}) {
    return (
        <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-astral-gold">{glyph}</span>
            <span className="text-muted-foreground">{name}</span>
            <span className="text-foreground">
                {formatDegree(position)} {position.sign.glyph}
            </span>
            <span className="text-muted-foreground">{position.sign.name}</span>
        </span>
    );
}

/** Almanac ticker under the hero: today's real sky, computed locally. */
export function SkyStrip({ className }: { className?: string }) {
    const sky = useSkySnapshot();

    return (
        <section
            aria-label="Cielo de hoy"
            className={cn(
                "border-astral-ink border-y bg-background/40 font-mono text-xs backdrop-blur-sm max-lg:backdrop-blur-none",
                className,
            )}
        >
            {sky ? (
                <Marquee className="py-3">
                    <span className="whitespace-nowrap text-astral-gold/80 uppercase tracking-[0.2em]">
                        Cielo de hoy · {DATE_FORMAT.format(sky.date)}
                    </span>
                    <Body {...sky.sun} />
                    <span className="flex items-center gap-2 whitespace-nowrap">
                        <MoonDisc
                            phase={sky.moon.phase}
                            className="size-4 shrink-0"
                        />
                        <span className="text-muted-foreground">Luna</span>
                        <span className="text-foreground">
                            {formatDegree(sky.moon.position)}{" "}
                            {sky.moon.position.sign.glyph}
                        </span>
                        <span className="text-muted-foreground">
                            {sky.moon.phase.name} ·{" "}
                            {Math.round(sky.moon.phase.illumination * 100)}%
                        </span>
                    </span>
                    <Body {...sky.venus} />
                    <Body {...sky.mars} />
                    <span className="whitespace-nowrap text-muted-foreground">
                        Lectura de amor · {OFFER.price} · pago único ·{" "}
                        {OFFER.chatHours} h de chat
                    </span>
                    <span className="whitespace-nowrap text-muted-foreground/70">
                        Calculado en tu navegador · precisión aprox. ±1°
                    </span>
                </Marquee>
            ) : (
                // Same height as the ticker so the page doesn't jump on mount.
                <div className="h-[2.6rem]" />
            )}
        </section>
    );
}

/** Small almanac card: tonight's Moon, drawn live. */
export function MoonToday({ className }: { className?: string }) {
    const sky = useSkySnapshot();

    return (
        <div
            className={cn(
                "flex items-center gap-4 border-astral-ink border-t pt-4 font-mono text-xs",
                className,
            )}
        >
            <div className="size-12 shrink-0">
                {sky && (
                    <MoonDisc phase={sky.moon.phase} className="size-full" />
                )}
            </div>
            <dl className="grid gap-0.5">
                <dt className="text-astral-gold/80 uppercase tracking-[0.2em]">
                    Luna de hoy
                </dt>
                <dd className="text-foreground">
                    {sky
                        ? `${sky.moon.phase.name} · ${Math.round(sky.moon.phase.illumination * 100)}% iluminada`
                        : " "}
                </dd>
                <dd className="text-muted-foreground">
                    {sky
                        ? `☾ ${formatDegree(sky.moon.position)} ${sky.moon.position.sign.glyph} ${sky.moon.position.sign.name}`
                        : " "}
                </dd>
            </dl>
        </div>
    );
}
