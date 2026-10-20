"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";
import { META_PIXEL_ID, metaEventId } from "@/core/analytics/domain/meta";
import { PRODUCTS } from "@/core/payment/domain/catalog";

declare global {
    interface Window {
        fbq?: (...args: unknown[]) => void;
    }
}

/** The team's own panel isn't anyone's visit. */
const isPanel = (path: string) => path.startsWith("/panel");

/**
 * Meta's standard events, the ones ads optimize for, by their exact names:
 * CompleteRegistration (quiz done, reading created; Lead too, which the
 * first campaigns used), ViewContent (saw the price), InitiateCheckout (the
 * pay button), AddPaymentInfo (back from the gateway having tried to pay),
 * Purchase (paid).
 */
type MetaEvent =
    | "Lead"
    | "CompleteRegistration"
    | "ViewContent"
    | "InitiateCheckout"
    | "AddPaymentInfo"
    | "Purchase";

/** Ours, for steps Meta has no name for: letters only, no accents. */
type MetaCustomEvent = "InicioCuestionario" | "FechaIngresada";

const live = () =>
    typeof window !== "undefined" && !isPanel(window.location.pathname);

/**
 * Events asked for before the base code ran: `fbq` only exists once the
 * afterInteractive script executes, which can be after this page's effects
 * (the paid return's Purchase is one). They wait here and `MetaPixel`
 * replays them as soon as it can, so a conversion is never dropped.
 */
const waiting: (() => void)[] = [];

function send(fire: () => void): void {
    if (typeof window === "undefined") return;
    if (typeof window.fbq === "function") fire();
    else waiting.push(fire);
}

/** Replays what was asked for before the pixel existed. */
export function flushMetaEvents(): void {
    if (typeof window === "undefined" || typeof window.fbq !== "function")
        return;
    const events = waiting.splice(0);
    for (const fire of events) fire();
}

/**
 * A standard event. `id` (the eventID) lets Meta drop a repeat, and is what
 * a server-side copy (Conversions API) would send to match it. Params never
 * carry what someone told us about their love life: a sign is fine, their
 * situation isn't.
 */
export function metaEvent(
    name: MetaEvent,
    params: Record<string, unknown> = {},
    id?: string,
): void {
    if (!live()) return;
    send(() => {
        if (!live()) return;
        window.fbq?.("track", name, params, id ? { eventID: id } : undefined);
    });
}

export function metaCustomEvent(
    name: MetaCustomEvent,
    params: Record<string, unknown> = {},
): void {
    if (!live()) return;
    send(() => {
        if (!live()) return;
        window.fbq?.("trackCustom", name, params);
    });
}

/**
 * A standard event once per reading, even across reloads and visits; only
 * on a real reading (not the example's page).
 */
export function metaEventOnce(
    name: MetaEvent,
    params: Record<string, unknown>,
    readingId: string,
): void {
    if (!live() || !window.location.pathname.startsWith("/lectura/r/")) return;
    const key = `astramia:${name.toLowerCase()}:${readingId}`;
    const id = metaEventId(name, readingId);
    try {
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, "1");
    } catch {}
    metaEvent(name, params, id);
}

/** What one reading costs, as Meta wants it: a number and a currency. */
export const READING_VALUE = {
    value: PRODUCTS.reading_unlock.price.amountCents / 100,
    currency: PRODUCTS.reading_unlock.price.currency,
};

/**
 * metaEventOnce from a server-rendered page: fires when it shows, or only
 * when the URL ends in `hash` (how the page knows they just paid).
 */
export function MetaEventOnce({
    name,
    readingId,
    hash,
    params = READING_VALUE,
}: {
    name: MetaEvent;
    readingId: string;
    hash?: string;
    /** Defaults to what a reading costs; a Purchase sends what was paid. */
    params?: Record<string, unknown>;
}) {
    useEffect(() => {
        if (hash && window.location.hash !== hash) return;
        metaEventOnce(name, params, readingId);
    }, [name, readingId, hash, params]);
    return null;
}

/**
 * Meta's base code, as their panel gives it, loaded after the page is
 * interactive. It counts the first page view; client-side navigations,
 * which don't reload the page, are counted here.
 */
export function MetaPixel() {
    const path = usePathname();
    const first = useRef(true);
    useEffect(() => {
        // Whatever this page asked for before the base code ran (a paid
        // return's Purchase, for one) goes out now, or on the next tick.
        flushMetaEvents();
        const retry = window.setTimeout(flushMetaEvents, 1000);
        return () => window.clearTimeout(retry);
    }, []);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        if (!isPanel(path)) send(() => window.fbq?.("track", "PageView"));
    }, [path]);

    return (
        <>
            <Script
                id="meta-pixel"
                strategy="afterInteractive"
                onReady={flushMetaEvents}
            >
                {`if (!location.pathname.startsWith("/panel")) {
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');
}`}
            </Script>
            <noscript>
                {/* biome-ignore lint/performance/noImgElement: Meta's no-JS beacon must be a plain img. */}
                <img
                    height="1"
                    width="1"
                    style={{ display: "none" }}
                    alt=""
                    src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
                />
            </noscript>
        </>
    );
}
