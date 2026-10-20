import "server-only";
import { createHash } from "node:crypto";
import { getLogger } from "@logtape/logtape";
import { z } from "zod";
import { env } from "@/config/env";
import { META_PIXEL_ID } from "@/core/analytics/domain/meta";

const logger = getLogger(["server", "analytics"]);

/**
 * Meta retires a Graph API version every few months and keeps the old ones
 * around for about two years. Bump this when Events Manager complains.
 */
const API_VERSION = "v23.0";

/** Meta wants personal data normalized before hashing it. */
const hashed = (value: string) =>
    createHash("sha256").update(value.trim().toLowerCase()).digest("hex");

const responseSchema = z.object({
    events_received: z.number().optional(),
    fbtrace_id: z.string().optional(),
    error: z.object({ message: z.string() }).optional(),
});

export interface MetaPurchaseEvent {
    /** The browser's own eventID: Meta drops whichever copy arrives second. */
    eventId: string;
    value: number;
    currency: string;
    /** The e-mail the buyer paid with, hashed here; null when unknown. */
    email?: string | null;
    /** Our user id, hashed here, for matching. */
    externalId?: string | null;
    eventSourceUrl: string;
    /** When it happened; now by default. */
    at?: Date;
}

/**
 * The Conversions API's copy of `Purchase`: the same event the pixel sends
 * when the buyer opens a paid reading, but from the server, so it survives
 * ad blockers and buyers who never come back to the page. Without an access
 * token it does nothing; the pixel is still the one that reports.
 */
export async function sendMetaPurchase(
    event: MetaPurchaseEvent,
): Promise<void> {
    const token = env.META_CAPI_ACCESS_TOKEN;
    if (!token) return;

    const userData: Record<string, string[]> = {};
    if (event.email) userData.em = [hashed(event.email)];
    if (event.externalId) userData.external_id = [hashed(event.externalId)];

    const body = {
        data: [
            {
                event_name: "Purchase",
                event_time: Math.floor(
                    (event.at ?? new Date()).getTime() / 1000,
                ),
                event_id: event.eventId,
                action_source: "website",
                event_source_url: event.eventSourceUrl,
                ...(event.email || event.externalId
                    ? { user_data: userData }
                    : {}),
                custom_data: {
                    value: event.value,
                    currency: event.currency,
                },
            },
        ],
        ...(env.META_CAPI_TEST_EVENT_CODE
            ? { test_event_code: env.META_CAPI_TEST_EVENT_CODE }
            : {}),
    };

    const url =
        `https://graph.facebook.com/${API_VERSION}/${META_PIXEL_ID}/events` +
        `?access_token=${encodeURIComponent(token)}`;

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            // Never hold a payment webhook longer than this if Meta is slow.
            signal: AbortSignal.timeout(3000),
        });
        const parsed = responseSchema.safeParse(
            await res.json().catch(() => null),
        );
        const answer = parsed.success ? parsed.data : null;
        if (!res.ok || answer?.error || !answer?.events_received)
            logger.warn("Meta Purchase {id} not received: {error}", {
                id: event.eventId,
                error: answer?.error?.message ?? `HTTP ${res.status}`,
            });
    } catch (error) {
        // A lost event is a gap in a report; a thrown one would be a lost sale.
        logger.warn("Meta Purchase {id} not sent: {error}", {
            id: event.eventId,
            error,
        });
    }
}
