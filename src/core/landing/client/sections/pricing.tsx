import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import { LEGAL_ROUTES, REFUND_POLICY } from "@/core/legal/domain/policies";
import {
    CardContent,
    CardFooter,
    CardHeader,
} from "@/frontend/components/ui/card";
import { Separator } from "@/frontend/components/ui/separator";
import {
    OFFER,
    PRICING_INCLUDES,
    START_READING_HREF,
} from "../../domain/content";
import { GoldButton, Magnetic, Reveal, TiltCard } from "../effects";
import { SectionIntro } from "./section-intro";

export function Pricing() {
    const { symbol, whole, cents } = OFFER.priceParts;

    return (
        <section
            id="precio"
            className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 md:py-28"
        >
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
                <Reveal className="flex flex-col gap-8 lg:col-span-5">
                    <SectionIntro
                        compact
                        index="04"
                        label="Precio"
                        title={
                            <>
                                Un pago.{" "}
                                <em className="text-astral-gold">
                                    Nada más después.
                                </em>
                            </>
                        }
                        description="Lo ves aquí y lo ves otra vez antes de pagar. No hay plan, no hay renovación."
                    />
                    <p className="flex items-end gap-2 font-display leading-none">
                        <span className="text-muted-foreground text-xl">
                            {symbol}
                        </span>
                        <span className="text-[7rem] text-astral-gold tracking-tight sm:text-[8.5rem]">
                            {whole}
                        </span>
                        <span className="pb-3 text-3xl text-astral-gold">
                            .{cents}
                        </span>
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
                        Pago único · tarjeta de crédito o débito
                    </p>
                </Reveal>

                <Reveal delay={0.1} className="lg:col-span-7 lg:pt-10">
                    <TiltCard className="border-astral-gold/30 bg-card shadow-[0_0_80px_-30px_var(--astral-gold)]">
                        <CardHeader className="gap-1">
                            <p className="font-mono text-[11px] text-astral-gold/80 uppercase tracking-[0.24em]">
                                Una lectura, la que elijas
                            </p>
                            <p className="font-display text-2xl">
                                Lo que incluye
                            </p>
                        </CardHeader>
                        <CardContent>
                            <ul className="flex flex-col">
                                {PRICING_INCLUDES.map(({ item, detail }) => (
                                    <li
                                        key={item}
                                        className="flex items-baseline gap-3 border-astral-ink border-b py-3.5 last:border-0"
                                    >
                                        <span className="text-sm sm:text-base">
                                            {item}
                                        </span>
                                        <span
                                            aria-hidden
                                            className="mb-1 flex-1 border-astral-ink border-b border-dotted"
                                        />
                                        <span className="shrink-0 text-right font-mono text-astral-gold-soft text-xs">
                                            {detail}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <Separator className="my-5 bg-astral-ink" />
                            <div className="flex items-baseline justify-between font-mono text-sm">
                                <span className="text-muted-foreground uppercase tracking-[0.18em]">
                                    Total
                                </span>
                                <span className="text-astral-gold text-lg">
                                    {OFFER.price}
                                </span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <Magnetic className="w-full sm:w-auto">
                                <GoldButton
                                    size="lg"
                                    asChild
                                    className="group h-12 w-full rounded-full px-7 text-base sm:w-auto"
                                >
                                    <Link
                                        href={START_READING_HREF}
                                        data-track="cta_pricing"
                                    >
                                        Empezar mi lectura
                                        <ArrowRight className="transition-transform group-hover:translate-x-1" />
                                    </Link>
                                </GoldButton>
                            </Magnetic>
                            <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                                <Lock className="size-3" /> Pago cifrado · no
                                guardamos tu tarjeta
                            </p>
                        </CardFooter>
                    </TiltCard>
                    <p className="mt-4 text-pretty text-muted-foreground text-xs leading-relaxed">
                        ¿Primera compra? Tienes{" "}
                        {REFUND_POLICY.firstPurchaseDays} días para pedir tu
                        reembolso.{" "}
                        <Link
                            href={LEGAL_ROUTES.refunds}
                            className="text-astral-gold underline-offset-4 hover:underline"
                        >
                            Política de reembolsos
                        </Link>
                        . Al comprar aceptas los{" "}
                        <Link
                            href={LEGAL_ROUTES.terms}
                            className="text-astral-gold underline-offset-4 hover:underline"
                        >
                            Términos
                        </Link>{" "}
                        y la{" "}
                        <Link
                            href={LEGAL_ROUTES.privacy}
                            className="text-astral-gold underline-offset-4 hover:underline"
                        >
                            Política de Privacidad
                        </Link>
                        .
                    </p>
                </Reveal>
            </div>
        </section>
    );
}
