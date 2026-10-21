"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { PRODUCTS } from "@/core/payment/domain/catalog";
import { META_PIXEL_ID } from "../domain/meta";

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

/** Calls made before the pixel loads (it waits for idle): keep them. */
type MetaCall = () => void;
const pending: MetaCall[] = [];

function whenReady(call: MetaCall): void {
    if (typeof window === "undefined") return;
    if (window.fbq) {
        call();
        return;
    }
    pending.push(call);
    if (pending.length > 50) pending.shift();
}

/** Runs after the pixel's script loads, replaying what happened meanwhile. */
export function flushMeta(): void {
    while (pending.length) pending.shift()?.();
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
    whenReady(() =>
        window.fbq?.("track", name, params, id ? { eventID: id } : undefined),
    );
}

export function metaCustomEvent(
    name: MetaCustomEvent,
    params: Record<string, unknown> = {},
): void {
    if (!live()) return;
    whenReady(() => window.fbq?.("trackCustom", name, params));
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
    const id = `${name.toLowerCase()}-${readingId}`;
    try {
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, "1");
    } catch {}
    metaEvent(name, params, id);
}

/**
 * metaEventOnce from a server-rendered page: fires when it shows, or only
 * when the URL ends in `hash` (how the page knows they just paid).
 */
export function MetaEventOnce({
    name,
    readingId,
    hash,
}: {
    name: MetaEvent;
    readingId: string;
    hash?: string;
}) {
    useEffect(() => {
        if (hash && window.location.hash !== hash) return;
        metaEventOnce(name, READING_VALUE, readingId);
    }, [name, readingId, hash]);
    return null;
}

/** What one reading costs, as Meta wants it: a number and a currency. */
export const READING_VALUE = {
    value: PRODUCTS.reading_unlock.price.amountCents / 100,
    currency: PRODUCTS.reading_unlock.price.currency,
};

/**
 * Meta's base code, as their panel gives it, loaded after the page is
 * interactive. It counts the first page view; client-side navigations,
 * which don't reload the page, are counted here.
 */
export function MetaPixel() {
    const path = usePathname();
    const first = useRef(true);

    // Meta's pixel is a heavy script: let the landing settle first. Any event
    // fired meanwhile is queued above and sent once it loads.
    useEffect(() => {
        if (window.fbq) {
            flushMeta();
            return;
        }
        if (isPanel(window.location.pathname)) return;
        const timer = window.setTimeout(() => {
            if (window.fbq || isPanel(window.location.pathname)) return;
            const script = document.createElement("script");
            script.id = "meta-pixel";
            script.text = `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
// We track the events we need by hand: Meta's DOM auto-scan is dead weight.
fbq('set', 'autoConfig', false, '${META_PIXEL_ID}');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');
`;
            document.head.appendChild(script);
            flushMeta();
        }, 5000);
        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        if (!isPanel(path))
            whenReady(() => window.fbq?.("track", "PageView"));
    }, [path]);

    return (
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
    );
}
