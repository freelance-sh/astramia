import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { AccountForm } from "@/core/account/client/account-form";
import { SaveAccountCard } from "@/core/account/client/save-account-card";
import { SignOutLink } from "@/core/account/client/sign-out-link";
import { GoldButton } from "@/core/landing/client/effects";
import { START_READING_HREF } from "@/core/landing/domain/content";
import { planFor } from "@/core/reading/domain/plans";
import type { ReadingSummary } from "@/core/reading/domain/types";
import { ReadingShell } from "./reading-shell";

/** Server-side, so the market's zone: Vercel runs in UTC. */
function longDate(iso: string): string {
    return new Date(iso).toLocaleDateString("es-PE", {
        timeZone: "America/Lima",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function StartReading() {
    return (
        <GoldButton asChild className="w-fit rounded-full">
            <Link href={START_READING_HREF}>
                Empezar mi lectura <ArrowRight />
            </Link>
        </GoldButton>
    );
}

function ReadingList({ readings }: { readings: ReadingSummary[] }) {
    return (
        <ul className="flex flex-col gap-3">
            {readings.map((r) => (
                <li key={r.id}>
                    <Link
                        href={`/lectura/r/${r.id}`}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-astral-ink bg-card/40 px-5 py-4 transition-colors hover:border-astral-gold/50"
                    >
                        <span className="flex flex-col gap-1">
                            <span className="font-display text-xl">
                                Lectura {planFor(r.topic).of} · {r.sunSign}
                            </span>
                            <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
                                {longDate(r.createdAt)} ·{" "}
                                {r.unlocked ? "Completa" : "Sin desbloquear"}
                            </span>
                        </span>
                        <ArrowRight className="shrink-0 text-astral-gold" />
                    </Link>
                </li>
            ))}
        </ul>
    );
}

/**
 * Every reading of the visitor: the way back from any device once they have
 * an account, and the place to sign in when this browser has none.
 */
export function MyReadingsScreen({
    account,
    readings,
}: {
    /** `null`: no session in this browser. */
    account: { email: string; anonymous: boolean } | null;
    readings: ReadingSummary[];
}) {
    const hasReadings = readings.length > 0;
    return (
        <ReadingShell>
            <h1 className="font-display text-4xl sm:text-5xl">Mis lecturas</h1>

            {hasReadings ? (
                <ReadingList readings={readings} />
            ) : (
                <div className="flex flex-col gap-4">
                    <p className="text-muted-foreground">
                        {account && !account.anonymous
                            ? "Todavía no tienes lecturas en tu cuenta."
                            : "Todavía no tienes lecturas aquí."}
                    </p>
                    <StartReading />
                </div>
            )}

            {account && !account.anonymous ? (
                <p className="flex flex-wrap items-center gap-x-2 text-muted-foreground text-sm">
                    Entraste como{" "}
                    <span className="text-foreground">{account.email}</span> ·
                    <SignOutLink />
                </p>
            ) : hasReadings ? (
                <SaveAccountCard title="Guarda tus lecturas" />
            ) : (
                <section className="flex flex-col gap-4 rounded-2xl border border-astral-ink bg-card/40 p-5">
                    <div>
                        <h2 className="font-display text-xl">
                            ¿Ya guardaste tu lectura?
                        </h2>
                        <p className="mt-1 text-muted-foreground text-sm">
                            Entra y la verás aquí.
                        </p>
                    </div>
                    <AccountForm signInOnly />
                </section>
            )}
        </ReadingShell>
    );
}
