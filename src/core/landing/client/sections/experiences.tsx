import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import {
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/frontend/components/ui/card";
import { EXPERIENCES, readingHref } from "../../domain/content";
import { Reveal, TiltCard } from "../effects";
import { SectionIntro } from "./section-intro";

export function Experiences() {
    const [featured, ...upcoming] = EXPERIENCES;

    return (
        <section
            id="experiencias"
            className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 md:py-28"
        >
            <Reveal>
                <SectionIntro
                    index="01"
                    label="Lecturas"
                    title={
                        <>
                            Una carta.{" "}
                            <em className="text-astral-gold">Cuatro</em>{" "}
                            lecturas.
                        </>
                    }
                    description="Empieza por la pregunta que te trae hoy. Cada lectura mira tu carta desde otro lado, con sus propias preguntas."
                />
            </Reveal>

            <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:gap-10">
                <Reveal className="lg:col-span-7">
                    <TiltCard className="relative h-full overflow-hidden border-astral-gold/40 bg-card">
                        <span
                            aria-hidden
                            className="-right-4 -top-10 pointer-events-none absolute select-none font-display text-[12rem] text-astral-gold/10 leading-none"
                        >
                            {featured.numeral}
                        </span>
                        <CardHeader className="relative gap-4">
                            <div className="flex items-center gap-3">
                                <Badge>Disponible</Badge>
                                <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
                                    {featured.anchor}
                                </span>
                            </div>
                            <CardTitle className="font-display font-normal text-4xl leading-tight sm:text-5xl">
                                {featured.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="relative">
                            <p className="max-w-lg text-pretty text-base text-muted-foreground leading-relaxed sm:text-lg">
                                {featured.description}
                            </p>
                        </CardContent>
                        <CardFooter className="relative mt-auto">
                            <Button
                                asChild
                                variant="link"
                                className="group h-auto px-0 text-base"
                            >
                                <Link href={readingHref(featured.id)}>
                                    Empezar mi lectura
                                    <ArrowRight className="transition-transform group-hover:translate-x-1" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </TiltCard>
                </Reveal>

                <Reveal delay={0.1} className="lg:col-span-5">
                    <ol className="divide-y divide-astral-ink border-astral-ink border-y">
                        {upcoming.map((experience) => (
                            <li key={experience.id}>
                                <Link
                                    href={readingHref(experience.id)}
                                    className="group grid grid-cols-[3rem_1fr_auto] items-baseline gap-4 py-6"
                                >
                                    <span className="font-display text-2xl text-astral-gold/70">
                                        {experience.numeral}
                                    </span>
                                    <div className="flex flex-col gap-1.5">
                                        <h3 className="font-display text-2xl leading-tight transition-colors group-hover:text-astral-gold">
                                            {experience.title}
                                        </h3>
                                        <p className="text-pretty text-muted-foreground text-sm">
                                            {experience.description}
                                        </p>
                                        <p className="font-mono text-[11px] text-muted-foreground/70 uppercase tracking-[0.2em]">
                                            {experience.anchor}
                                            {experience.needs &&
                                                ` · ${experience.needs}`}
                                        </p>
                                    </div>
                                    <ArrowRight className="size-5 self-center text-astral-gold transition-transform group-hover:translate-x-1" />
                                </Link>
                            </li>
                        ))}
                    </ol>
                </Reveal>
            </div>
        </section>
    );
}
