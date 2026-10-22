import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { FINAL_CTA, OFFER, START_READING_HREF } from "../../domain/content";
import { GoldButton, Magnetic, Reveal, ScrambleText } from "../effects";

export function FinalCta() {
    return (
        <section className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-36">
            <div
                aria-hidden
                className="-translate-x-1/2 pointer-events-none absolute top-1/2 left-1/2 h-72 w-[min(90vw,48rem)] -translate-y-1/2 rounded-full bg-astral-gold/15 blur-3xl"
            />
            <Reveal className="relative grid gap-10 lg:grid-cols-12">
                <h2 className="text-balance font-display text-5xl leading-[0.98] sm:text-6xl md:text-7xl lg:col-span-9 lg:text-[5.5rem]">
                    <ScrambleText text={FINAL_CTA.headline} duration={1.8} />
                </h2>
                <div className="flex flex-col gap-6 lg:col-span-9 lg:col-start-4">
                    <p className="max-w-lg text-pretty text-lg text-muted-foreground">
                        {FINAL_CTA.sub}
                    </p>
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                        <Magnetic className="w-full sm:w-auto">
                            <GoldButton
                                size="lg"
                                asChild
                                className="group h-13 w-full rounded-full px-8 text-base sm:w-auto"
                            >
                                <Link
                                    href={START_READING_HREF}
                                    data-track="cta_final"
                                >
                                    Empezar mi lectura · {OFFER.price}
                                    <ArrowRight className="transition-transform group-hover:translate-x-1" />
                                </Link>
                            </GoldButton>
                        </Magnetic>
                        <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
                            Pago único · {OFFER.chatHours} h de chat · lectura
                            para siempre
                        </p>
                    </div>
                </div>
            </Reveal>
        </section>
    );
}
