import "server-only";
import { getLogger } from "@logtape/logtape";
import { PostHog } from "posthog-node";
import { env } from "@/config/env";

const logger = getLogger(["server", "analytics"]);

/**
 * An event only the server sees (the purchase, mainly), tied to the account
 * the browser identified as. Serverless functions are short-lived, so the
 * client is created, sent and shut down in one call. A lost event is a gap in
 * a chart; a thrown one would be a lost sale.
 */
export async function captureServerEvent(
    name: string,
    distinctId: string,
    properties: Record<string, string | number | boolean>,
): Promise<void> {
    if (!env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;
    const posthog = new PostHog(env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, {
        host: env.NEXT_PUBLIC_POSTHOG_HOST,
        flushAt: 1,
        flushInterval: 0,
        // Never hold a payment webhook longer than this if PostHog is slow.
        requestTimeout: 3000,
    });
    try {
        posthog.capture({ distinctId, event: name, properties });
    } catch (error) {
        logger.warn("PostHog event {name} not sent: {error}", { name, error });
    } finally {
        await posthog.shutdown().catch(() => {});
    }
}
