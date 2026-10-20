"use client";

import { Lock } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { metaEvent, READING_VALUE } from "@/core/analytics/client/meta-pixel";
import {
    markCheckout,
    markPaywallButtonSeen,
} from "@/core/analytics/client/paywall";
import { flush, track } from "@/core/analytics/client/track";
import { GoldButton } from "@/core/landing/client/effects";
import { Spinner } from "@/frontend/components/ui/spinner";
import { useReadings } from "../hooks";

/** Opens the hosted checkout; the gateway sends the buyer back to this page. */
export function UnlockButton({
    readingId,
    label,
}: {
    readingId: string;
    label: string;
}) {
    const checkout = useReadings().useCheckout(readingId);
    const { reset } = checkout;
    const box = useRef<HTMLDivElement>(null);
    const seen = useRef(false);

    // Back from the gateway, the browser may restore this page from its
    // back/forward cache with the state frozen at "redirecting": the button
    // would spin forever. A restored page starts over.
    useEffect(() => {
        const onShow = (event: PageTransitionEvent) => {
            if (event.persisted) reset();
        };
        window.addEventListener("pageshow", onShow);
        return () => window.removeEventListener("pageshow", onShow);
    }, [reset]);

    // The price can be read without the button ever entering the screen:
    // that's a different drop-off than seeing "Desbloquear" and leaving.
    useEffect(() => {
        const element = box.current;
        if (!element || seen.current) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry?.isIntersecting) return;
                seen.current = true;
                markPaywallButtonSeen(readingId);
                track("paywall_button_view", { label }, readingId);
                observer.disconnect();
            },
            { threshold: 0.5 },
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, [label, readingId]);

    async function start() {
        markCheckout(readingId);
        track("checkout_click", { label }, readingId);
        metaEvent("InitiateCheckout", READING_VALUE);
        try {
            const result = await checkout.mutateAsync(undefined);
            const target = new URL(
                result.response.checkoutUrl,
                window.location.href,
            );
            // Back on this very page (the owner skips the gateway): a URL
            // that differs only after # doesn't reload, so reload it here.
            if (
                target.origin === window.location.origin &&
                target.pathname === window.location.pathname &&
                target.search === window.location.search
            ) {
                flush();
                window.location.hash = target.hash;
                window.location.reload();
                return;
            }
            track("checkout_open", { provider: target.host }, readingId);
            flush();
            window.location.assign(target.href);
        } catch {
            track("checkout_error", {}, readingId);
            toast.error("No pudimos abrir el pago. Inténtalo de nuevo.");
        }
    }

    // Stays busy after success too, while the browser navigates away.
    const busy = checkout.isPending || checkout.isSuccess;

    return (
        <div ref={box} className="w-full sm:w-auto">
            <GoldButton
                size="lg"
                className="w-full rounded-full sm:w-auto"
                disabled={busy}
                onClick={start}
            >
                {busy ? <Spinner /> : <Lock />}
                {label}
            </GoldButton>
        </div>
    );
}
