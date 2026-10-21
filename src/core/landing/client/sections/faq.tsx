import { ChevronDown } from "lucide-react";
import { FAQS } from "../../domain/content";
import { Reveal } from "../effects";
import { SectionIntro } from "./section-intro";

export function Faq() {
    return (
        <section
            id="preguntas"
            className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 md:py-28"
        >
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
                <Reveal className="lg:col-span-4">
                    <SectionIntro
                        compact
                        index="06"
                        label="Preguntas"
                        title={
                            <>
                                Lo que nos preguntan{" "}
                                <em className="text-astral-gold">
                                    antes de pagar.
                                </em>
                            </>
                        }
                    />
                </Reveal>
                <Reveal delay={0.1} className="lg:col-span-8">
                    <div className="border-astral-ink border-t">
                        {FAQS.map((faq, i) => (
                            <details
                                key={faq.question}
                                className="group border-astral-ink border-b"
                            >
                                <summary className="flex cursor-pointer list-none items-baseline gap-4 py-6 font-display text-xl hover:text-astral-gold sm:text-2xl [&::-webkit-details-marker]:hidden">
                                    <span className="font-mono text-astral-gold/70 text-xs">
                                        {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <span className="flex-1">{faq.question}</span>
                                    <ChevronDown className="size-5 shrink-0 self-center text-astral-gold transition-transform group-open:rotate-180" />
                                </summary>
                                <div className="max-w-2xl pb-7 pl-9 text-pretty text-base text-muted-foreground leading-relaxed">
                                    {faq.answer}
                                </div>
                            </details>
                        ))}
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
