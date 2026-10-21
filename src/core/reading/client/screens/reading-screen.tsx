import { Suspense } from "react";
import { MetaEventOnce } from "@/core/analytics/client/meta-pixel";
import { Starfield } from "@/core/landing/client/effects";
import { OFFER } from "@/core/landing/domain/content";
import { BUSINESS } from "@/core/legal/domain/business";
import { LEGAL_ROUTES } from "@/core/legal/domain/policies";
import { CONTINUE_ANCHOR, paidSkies } from "@/core/reading/domain/story";
import type { ChatMessage, Reading } from "@/core/reading/domain/types";
import { FormingSky } from "../components/forming-sky";
import { ReadingChat } from "../components/reading-chat";
import { ReadingReady } from "../components/reading-ready";
import { RefreshWhile } from "../components/refresh-while";
import { UnlockButton } from "../components/unlock-button";
import { ReadingStory } from "../story/reading-story";

export type PaymentState = "none" | "confirming" | "failed" | "review";

/** Under the preview, in the story's own style. */
const BOX =
    "flex flex-col gap-4 rounded-2xl border border-astral-gold/30 bg-background/80 p-6 backdrop-blur-md max-lg:backdrop-blur-none";

/** Where the free part stops: the price, the button, or the payment's state. */
function UnlockBox({
    reading,
    payment,
}: {
    reading: Reading;
    payment: PaymentState;
}) {
    // Back from the gateway with a payment, pending or turned down: they
    // gave their payment details. (Paid goes straight to the story.)
    const tried = payment !== "none" && (
        <MetaEventOnce name="AddPaymentInfo" readingId={reading.id} />
    );
    if (payment === "confirming")
        return (
            <div className={BOX}>
                {tried}
                <RefreshWhile />
                <p className="font-display text-2xl">
                    Estamos confirmando tu pago…
                </p>
                <p className="text-muted-foreground text-sm">
                    Suele tardar unos segundos. No cierres esta página.
                </p>
            </div>
        );
    if (payment === "review")
        return (
            <div className={BOX}>
                {tried}
                <p className="font-display text-2xl">
                    Estamos revisando tu pago
                </p>
                <p role="alert" className="text-muted-foreground text-sm">
                    No pudimos confirmarlo automáticamente. No vuelvas a pagar:
                    escríbenos a{" "}
                    <a
                        href={`mailto:${BUSINESS.supportEmail}`}
                        className="underline underline-offset-4"
                    >
                        {BUSINESS.supportEmail}
                    </a>{" "}
                    con tu número de operación y lo resolvemos.
                </p>
            </div>
        );
    return (
        <div className={BOX}>
            {tried}
            {payment === "failed" && (
                <p role="alert" className="text-destructive text-sm">
                    El pago no se completó. No se te cobró nada; puedes
                    intentarlo otra vez.
                </p>
            )}
            <p className="font-display text-2xl leading-tight">
                Tu lectura completa y {OFFER.chatHours} horas de chat con tu Sol
            </p>
            <UnlockButton
                readingId={reading.id}
                label={`Desbloquear por ${OFFER.price}`}
            />
            <p className="text-muted-foreground text-sm">
                Pago único. Sin suscripción.{" "}
                <a
                    href={LEGAL_ROUTES.refunds}
                    className="underline underline-offset-4"
                >
                    Política de reembolsos
                </a>
                .
            </p>
        </div>
    );
}

/** Before paying: the start of their story, up to the door. */
export function LockedReadingScreen({
    reading,
    payment,
}: {
    reading: Reading;
    payment: PaymentState;
}) {
    return (
        <ReadingStory
            reading={reading}
            door={<UnlockBox reading={reading} payment={payment} />}
        />
    );
}

/**
 * Paid, still being written (usually done during checkout): a screen of
 * its own, not a box in the story, while the constellations of what's
 * coming form. The story takes over, right where it stopped, once it's
 * written. It only shows if it lasts: a reading already written arrives
 * before it fades in.
 */
export function WritingScreen({
    reading,
    refresh = false,
}: {
    reading: Reading;
    /** The text is being written elsewhere: poll until it lands. */
    refresh?: boolean;
}) {
    return (
        <div className="theme-astral relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-6 text-center text-foreground">
            {refresh && <RefreshWhile />}
            <Starfield />
            <div
                role="status"
                className="animate-arrive relative z-10 flex max-w-md flex-col items-center gap-8"
            >
                <FormingSky skies={paidSkies(reading)} />
                <div className="flex flex-col items-center gap-3">
                    <p className="font-mono text-[11px] text-astral-gold uppercase tracking-[0.24em]">
                        Lectura desbloqueada
                    </p>
                    <h1 className="text-balance font-display text-4xl leading-[1.05] sm:text-5xl">
                        Uniendo las estrellas que faltan
                    </h1>
                    <p className="text-pretty text-muted-foreground">
                        Tu Sol está escribiendo el resto de tu historia. Solo
                        tarda unos segundos.
                    </p>
                </div>
            </div>
        </div>
    );
}

export function UnlockedReadingScreen({
    reading,
    content,
}: {
    reading: Reading;
    /** Streams in: the full text may still be being written. */
    content: React.ReactNode;
}) {
    // Back from paying: counted as soon as the page shows, not once the full
    // reading is written (30–60 s): a buyer who doesn't wait still bought.
    const paid = `#${CONTINUE_ANCHOR}`;
    return (
        <>
            <MetaEventOnce
                name="AddPaymentInfo"
                readingId={reading.id}
                hash={paid}
            />
            <MetaEventOnce name="Purchase" readingId={reading.id} hash={paid} />
            <Suspense fallback={<WritingScreen reading={reading} />}>
                {content}
            </Suspense>
        </>
    );
}

export function ReadingBody({
    reading,
    messages,
    account,
    notice,
}: {
    reading: Reading;
    messages: ChatMessage[];
    /** Below the chat, for a reading without an account: save it in one. */
    account?: React.ReactNode;
    /** On the cover (e.g. "it only lives in this browser"). */
    notice?: React.ReactNode;
}) {
    if (!reading.content) return <WritingScreen reading={reading} refresh />;
    return (
        <>
            <ReadingReady readingId={reading.id} />
            <ReadingStory
                reading={reading}
                content={reading.content}
                notice={notice}
                account={account}
                chat={
                    <ReadingChat
                        readingId={reading.id}
                        initialMessages={messages}
                        expiresAt={reading.chatExpiresAt}
                        sunSign={reading.sunSign}
                        topic={reading.topic}
                    />
                }
            />
        </>
    );
}
