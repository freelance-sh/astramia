import "server-only";
import { createHash } from "node:crypto";
import { getLogger } from "@logtape/logtape";
import { env } from "@/config/env";
import { ServerConfig } from "@/config/server-config";
import { META_PIXEL_ID } from "../domain/meta";

const logger = getLogger(["server", "analytics"]);

const hash = (value: string) =>
    createHash("sha256").update(value.trim().toLowerCase()).digest("hex");

/**
 * Meta's Conversions API: the purchase is sent from the server when the
 * gateway confirms it, so closing the tab before coming back doesn't lose
 * it. The client pixel sends the same event id and Meta keeps one.
 */
export async function sendMetaPurchase({
    readingId,
    orderId,
    amountCents,
    currency,
    email,
    userId,
}: {
    readingId: string;
    orderId: string;
    amountCents: number;
    currency: string;
    email?: string | null;
    userId: string;
}): Promise<void> {
    const token = env.META_CAPI_TOKEN;
    if (!token) return;

    const userData: Record<string, string[]> = {
        external_id: [hash(userId)],
    };
    if (email) userData.em = [hash(email)];

    const payload = {
        data: [
            {
                event_name: "Purchase",
                event_time: Math.floor(Date.now() / 1000),
                // The browser pixel uses this same id on the return page.
                event_id: `purchase-${readingId}`,
                action_source: "website",
                event_source_url: `${ServerConfig.baseUrl}/lectura/r/${readingId}`,
                user_data: userData,
                custom_data: {
                    value: amountCents / 100,
                    currency,
                    order_id: orderId,
                    content_ids: [readingId],
                    content_name: "Lectura de amor",
                    content_type: "product",
                },
            },
        ],
        access_token: token,
        ...(env.META_TEST_EVENT_CODE
            ? { test_event_code: env.META_TEST_EVENT_CODE }
            : {}),
    };

    try {
        const response = await fetch(
            `https://graph.facebook.com/${env.META_GRAPH_VERSION}/${META_PIXEL_ID}/events`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(4000),
            },
        );
        if (!response.ok) {
            const text = await response.text().catch(() => "");
            logger.warn("Meta Purchase not sent ({status}): {text}", {
                status: response.status,
                text: text.slice(0, 300),
            });
        }
    } catch (error) {
        logger.warn("Meta Purchase not sent: {error}", { error });
    }
}
