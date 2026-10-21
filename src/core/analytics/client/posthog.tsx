"use client";

import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useEffect } from "react";
import { env } from "@/config/env";
import { authClient } from "@/frontend/auth/auth";

const TOKEN = env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

type Props = Record<string, string | number | boolean | null | undefined>;

/** The team's own panel isn't anyone's visit. */
const isPanel = (path: string) => path.startsWith("/panel");

const UTM = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
] as const;
const CAMPAIGN_KEY = "astramia:campaign";

/**
 * The campaign that brought them, from the first link they arrived by. Kept
 * in localStorage and registered as a super property, so every event after
 * the first page can still be split by ad.
 */
function firstTouch(): Record<string, string> {
    try {
        const kept = localStorage.getItem(CAMPAIGN_KEY);
        if (kept) return JSON.parse(kept) as Record<string, string>;
    } catch {}
    const params = new URLSearchParams(window.location.search);
    const found: Record<string, string> = {};
    for (const key of UTM) {
        const value = params.get(key);
        if (value) found[key] = value;
    }
    if (Object.keys(found).length) {
        try {
            localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(found));
        } catch {}
    }
    return found;
}

/**
 * PostHog's browser SDK. Initialized when the module loads, before any page
 * renders, so the first events aren't lost. Without a token it stays off and
 * every call below is a no-op.
 */
if (typeof window !== "undefined" && TOKEN) {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    posthog.init(TOKEN, {
        api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
        defaults: "2026-05-30",
        capture_pageview: "history_change",
        capture_pageleave: true,
        person_profiles: "identified_only",
        // Our own events say what happened; autocapture, dead clicks and
        // surveys only add listeners and third-party scripts on a phone.
        autocapture: false,
        disable_surveys: true,
        mask_all_text: true,
        before_send: (event) => {
            const url = event?.properties?.$current_url;
            if (typeof url === "string" && isPanel(new URL(url).pathname))
                return null;
            return event;
        },
        session_recording: {
            // Never the dates, e-mail or messages they type; the quiz and the
            // reading carry `ph-mask`, so what they answer stays out too.
            maskAllInputs: true,
            maskTextSelector: ".ph-mask",
            // The recorder is the heaviest third party on the page.
            collectFonts: false,
            sampling: { mousemove: coarse ? false : 200 },
        },
    });
    const campaign = firstTouch();
    if (Object.keys(campaign).length) posthog.register(campaign);
}

/** What they answered is theirs: PostHog gets the funnel, not the answer. */
const PRIVATE_PROPS = new Set(["answer", "ranking"]);

/**
 * One of our events, in PostHog too. It carries the reading it belongs to and
 * the page it happened on, the same props the panel gets.
 */
export function capturePostHog(
    name: string,
    props?: Props,
    readingId?: string,
    instant = false,
): void {
    if (!TOKEN || typeof window === "undefined") return;
    if (isPanel(window.location.pathname)) return;
    const properties: Props = { ...props };
    for (const key of PRIVATE_PROPS) delete properties[key];
    if (readingId) properties.reading_id = readingId;
    properties.path = window.location.pathname;
    // `instant` is for events sent while the tab is going away.
    posthog.capture(
        name,
        properties,
        instant ? { send_instantly: true } : undefined,
    );
}

let identified: string | null = null;

/**
 * Ties the visit to its account, once per page: the reading is created by an
 * anonymous session, so the session only shows up after the quiz's submit.
 * This id is also what the server sends with a purchase.
 */
export function PostHogAnalytics() {
    const path = usePathname();
    useEffect(() => {
        if (!TOKEN) return;
        let cancelled = false;
        authClient
            .getSession()
            .then(({ data }) => {
                if (cancelled || isPanel(path)) return;
                if (!data?.user) {
                    if (identified) {
                        posthog.reset();
                        identified = null;
                    }
                    return;
                }
                if (data.user.id === identified) return;
                // Signing up from an anonymous reading leaves the old id
                // behind: tell PostHog it's the same person.
                if (identified) posthog.alias(data.user.id, identified);
                identified = data.user.id;
                posthog.identify(data.user.id, {
                    email: data.user.email,
                    anonymous: Boolean(data.user.isAnonymous),
                });
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [path]);
    return null;
}
