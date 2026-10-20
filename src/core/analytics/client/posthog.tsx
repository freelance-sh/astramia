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

/**
 * PostHog's browser SDK. Initialized when the module loads, before any page
 * renders, so the first events aren't lost. Without a token it stays off and
 * every call below is a no-op.
 */
if (typeof window !== "undefined" && TOKEN) {
    posthog.init(TOKEN, {
        api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
        defaults: "2026-05-30",
        capture_pageview: "history_change",
        capture_pageleave: true,
        person_profiles: "identified_only",
        // Our own events say what happened; autocapture needn't read the
        // answers on the buttons it records.
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
        },
    });
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
): void {
    if (!TOKEN || typeof window === "undefined") return;
    if (isPanel(window.location.pathname)) return;
    const properties: Props = { ...props };
    for (const key of PRIVATE_PROPS) delete properties[key];
    if (readingId) properties.reading_id = readingId;
    properties.path = window.location.pathname;
    posthog.capture(name, properties);
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
