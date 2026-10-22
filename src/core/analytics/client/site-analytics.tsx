"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { FOREIGN_ERROR } from "../domain/events";
import { flush, track, trackOn } from "./track";

const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
/** Errors worth a row each, per page: a loop of them would flood the table. */
const MAX_ERRORS = 5;

/** Where a visit came from: another site, and the campaign in the link. */
function arrival(): Record<string, string | null> {
    const params = new URLSearchParams(window.location.search);
    let ref: string | null = null;
    try {
        const from = document.referrer && new URL(document.referrer);
        if (from && from.host !== window.location.host) ref = from.host;
    } catch {}
    return {
        ref,
        ...Object.fromEntries(UTM.map((key) => [key, params.get(key)])),
    };
}

/**
 * Site-wide events: each page seen, the seconds it was actually on screen
 * (sent in slices whenever it hides, so a closed tab still counts), every
 * button and link pressed, and errors in the page.
 */
export function SiteAnalytics() {
    const path = usePathname();
    useEffect(() => {
        track("page_view", {
            ...arrival(),
            width: window.innerWidth,
            height: window.innerHeight,
            touch: window.matchMedia("(pointer: coarse)").matches,
            lang: navigator.language,
            zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        // Seconds on screen since the last slice, for this page.
        let shownSince = document.hidden ? null : Date.now();
        const slice = () => {
            if (shownSince === null) return;
            const seconds = Math.round((Date.now() - shownSince) / 1000);
            shownSince = document.hidden ? null : Date.now();
            if (seconds > 0) trackOn(path, "page_time", { seconds });
        };
        const onVisibility = () => {
            if (!document.hidden) {
                shownSince = Date.now();
                return;
            }
            slice();
            flush();
        };
        const onLeave = () => {
            slice();
            flush();
        };
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("pagehide", onLeave);
        return () => {
            slice();
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("pagehide", onLeave);
        };
    }, [path]);

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            const target = (event.target as Element | null)?.closest(
                "a, button, [role=button], [data-track]",
            );
            if (!(target instanceof HTMLElement)) return;
            const label =
                target.dataset.track ??
                target.getAttribute("aria-label") ??
                target.textContent;
            track("click", {
                label: (label ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
                href:
                    target instanceof HTMLAnchorElement
                        ? target.getAttribute("href")
                        : null,
            });
        };
        let errors = 0;
        const onError = (message: string, source: string) => {
            if (FOREIGN_ERROR.test(message) || errors++ >= MAX_ERRORS) return;
            track("client_error", { message: message.slice(0, 300), source });
        };
        const onWindowError = (event: ErrorEvent) =>
            onError(event.message, "error");
        const onRejection = (event: PromiseRejectionEvent) =>
            onError(String(event.reason?.message ?? event.reason), "promise");
        document.addEventListener("click", onClick, { capture: true });
        window.addEventListener("error", onWindowError);
        window.addEventListener("unhandledrejection", onRejection);
        return () => {
            document.removeEventListener("click", onClick, { capture: true });
            window.removeEventListener("error", onWindowError);
            window.removeEventListener("unhandledrejection", onRejection);
        };
    }, []);

    return null;
}
