"use client";

import { useEffect } from "react";
import { track } from "@/core/analytics/client/track";

/** The full text is on screen: how long the buyer waited for it to be written. */
export function ReadingReady({ readingId }: { readingId: string }) {
    useEffect(() => {
        track(
            "reading_ready",
            { ms: Math.round(performance.now()) },
            readingId,
        );
    }, [readingId]);
    return null;
}
