import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import {
    SaveAccountCard,
    SaveAccountNotice,
} from "@/core/account/client/save-account-card";
import { recordEvent } from "@/core/analytics/server/repository/events";
import { captureReadingEvent } from "@/core/analytics/server/posthog";
import { paidPriceService } from "@/core/payment/server/services/paid-price-service";
import { payerEmailService } from "@/core/payment/server/services/payer-email-service";
import { syncCheckoutReturnService } from "@/core/payment/server/services/sync-checkout-return-service";
import {
    LockedReadingScreen,
    type PaymentState,
    ReadingBody,
    UnlockedReadingScreen,
} from "@/core/reading/client/screens/reading-screen";
import { CONTINUE_ANCHOR } from "@/core/reading/domain/story";
import { listChatMessagesService } from "@/core/reading/server/services/chat-services";
import { ensureReadingContentService } from "@/core/reading/server/services/ensure-reading-content-service";
import { getReadingService } from "@/core/reading/server/services/get-reading-service";
import { authenticate } from "@/server/auth/auth";

/** The full reading may be written during this render (~30–60 s). */
export const maxDuration = 120;

type Query = Record<string, string | string[] | undefined>;

function flatten(query: Query): Record<string, string | undefined> {
    return Object.fromEntries(
        Object.entries(query).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
    );
}

/**
 * The reading page. Calls services directly (RSC) and hands the screens plain
 * props; only the pay button and the chat are client islands.
 */
export default async function ReadingPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<Query>;
}) {
    const { id } = await params;

    // Before the session check: a buyer who comes back from the gateway in
    // another browser (no cookie) still gets the payment applied.
    let payment: PaymentState = "none";
    const query = flatten(await searchParams);
    const returned = await syncCheckoutReturnService(query);
    if (query.checkout) {
        // How the gateway sent them back: paid, failed, pending, or left.
        const outcome = !returned.ok
            ? returned.error.code === "CONFLICT"
                ? "review"
                : "error"
            : (returned.data?.order?.status ?? "left");
        const provider = query.checkout;
        after(async () => {
            await recordEvent("checkout_return", {
                readingId: id,
                props: { provider, outcome },
            });
            // Same outcome in PostHog, after the redirect: the owner is
            // looked up there, so a paid return still counts.
            await captureReadingEvent("checkout_return", id, {
                provider,
                outcome,
            });
        });
    }
    if (!returned.ok) {
        // Never offer to pay again for a payment we couldn't apply: a mismatch
        // needs a person, anything else (gateway down) retries on refresh.
        payment = returned.error.code === "CONFLICT" ? "review" : "confirming";
    } else if (returned.data) {
        const status = returned.data.order?.status;
        // Paid: drop the gateway's query string so a reload is a clean view.
        // Back on the story, right where the free part stopped.
        if (status === "paid") redirect(`/lectura/r/${id}#${CONTINUE_ANCHOR}`);
        payment = status === "failed" ? "failed" : "confirming";
    } else if (query.checkout) {
        // Back from the gateway with no payment (they left without paying):
        // the button again, on a clean URL.
        redirect(`/lectura/r/${id}`);
    }

    const session = await authenticate();
    if (!session) notFound();
    const userId = session.user.id;

    const reading = await getReadingService(userId, id);
    if (!reading.ok) notFound();

    if (reading.data.locked)
        return <LockedReadingScreen reading={reading.data} payment={payment} />;

    // What the buyer paid, for Meta: an unlock without a paid order is the
    // owner's free one, and must not count as a Purchase.
    const paidPrice = await paidPriceService(userId, id);

    // Bought without an account: offer one, pre-filled with the paying
    // e-mail. With one, it's already saved: nothing to say.
    const anonymous = Boolean(session.user.isAnonymous);
    const account = anonymous ? (
        <SaveAccountCard defaultEmail={await payerEmailService(userId, id)} />
    ) : undefined;

    const notice = anonymous ? <SaveAccountNotice /> : undefined;
    return (
        <UnlockedReadingScreen
            reading={reading.data}
            price={paidPrice}
            content={
                <FullReading
                    userId={userId}
                    id={id}
                    account={account}
                    notice={notice}
                />
            }
        />
    );
}

async function FullReading({
    userId,
    id,
    account,
    notice,
}: {
    userId: string;
    id: string;
    account: React.ReactNode;
    notice: React.ReactNode;
}) {
    const [reading, messages] = await Promise.all([
        ensureReadingContentService(userId, id),
        listChatMessagesService(userId, id),
    ]);
    if (!reading.ok) throw new Error("No pudimos escribir tu lectura");
    return (
        <ReadingBody
            reading={reading.data}
            messages={messages.ok ? messages.data : []}
            account={account}
            notice={notice}
        />
    );
}
