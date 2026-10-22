/**
 * The browser's side of the analytics: `track()` queues an event and a
 * batch leaves every few seconds, or when the page is hidden, with
 * `sendBeacon` (it survives the tab closing and nobody waits on it).
 * The visitor id lives in localStorage, the visit's in sessionStorage.
 */

import { capturePostHog } from "./posthog";

type Props = Record<string, string | number | boolean | null>;
type TrackOptions = { instant?: boolean };

/**
 * PostHog captures these itself (pageviews and clicks). Time on page is not
 * one of them: how long a page held someone is what tells a bounce from a
 * visit that nearly converted, so `page_time` goes to PostHog too.
 */
const OWN_EVENTS = new Set(["page_view", "click"]);

interface Pending {
    name: string;
    at: number;
    path: string;
    readingId?: string;
    props?: Props;
}

const ENDPOINT = "/api/v1/events";
const FLUSH_MS = 4000;
const BATCH = 50;
const READING_PATH = /^\/lectura\/r\/([^/?#]+)/;

let queue: Pending[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let ids: { visitor: string; session: string } | undefined;

function keptId(storage: () => Storage, key: string): string {
    try {
        const kept = storage().getItem(key);
        if (kept) return kept;
        const id = crypto.randomUUID();
        storage().setItem(key, id);
        return id;
    } catch {
        // Storage blocked (private mode, some in-app browsers): this page only.
        return crypto.randomUUID();
    }
}

function identity() {
    ids ??= {
        visitor: keptId(() => localStorage, "astramia:visitor"),
        session: keptId(() => sessionStorage, "astramia:visit"),
    };
    return ids;
}

/** Records an event; on a reading's page it's tied to that reading. */
export function track(
    name: string,
    props?: Props,
    readingId?: string,
    options?: TrackOptions,
): void {
    if (typeof window === "undefined") return;
    trackOn(window.location.pathname, name, props, readingId, options);
}

/** Records an event about `path`, which may be a page just left. */
export function trackOn(
    path: string,
    name: string,
    props?: Props,
    readingId?: string,
    options?: TrackOptions,
): void {
    if (typeof window === "undefined") return;
    // The team's own panel isn't the product.
    if (path.startsWith("/panel")) return;
    const id = readingId ?? READING_PATH.exec(path)?.[1];
    if (!OWN_EVENTS.has(name))
        capturePostHog(name, props, id, options?.instant);
    queue.push({
        name,
        at: Date.now(),
        path,
        readingId: id,
        props,
    });
    if (queue.length >= BATCH) flush();
    else timer ??= setTimeout(flush, FLUSH_MS);
}

/** Sends what's queued now. */
export function flush(): void {
    clearTimeout(timer);
    timer = undefined;
    while (queue.length) {
        const sent = queue.slice(0, BATCH);
        queue = queue.slice(BATCH);
        const now = Date.now();
        const { visitor, session } = identity();
        const body = JSON.stringify({
            visitorId: visitor,
            sessionId: session,
            events: sent.map(({ at, ...event }) => ({
                ...event,
                ago: Math.min(Math.max(now - at, 0), 60 * 60 * 1000),
            })),
        });
        const beacon = new Blob([body], { type: "application/json" });
        if (!navigator.sendBeacon?.(ENDPOINT, beacon))
            fetch(ENDPOINT, {
                method: "POST",
                body,
                headers: { "Content-Type": "application/json" },
                keepalive: true,
            }).catch(() => {});
    }
}
