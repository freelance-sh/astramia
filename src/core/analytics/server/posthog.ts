import "server-only";
import { getLogger } from "@logtape/logtape";
import { sql } from "drizzle-orm";
import { PostHog } from "posthog-node";
import { env } from "@/config/env";
import { db } from "@/server/drizzle/db";

const logger = getLogger(["server", "analytics"]);

/**
 * One short-lived client per event. Serverless functions are killed after the
 * response, so the event is sent and flushed in the same call. A lost event is
 * a gap in a chart; a thrown one would be a lost sale.
 */
async function send(
    name: string,
    run: (posthog: PostHog) => void,
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
        run(posthog);
    } catch (error) {
        logger.warn("PostHog event {name} not sent: {error}", { name, error });
    } finally {
        await posthog.shutdown().catch(() => {});
    }
}

export async function captureServerEvent(
    name: string,
    distinctId: string,
    properties: Record<string, string | number | boolean>,
): Promise<void> {
    await send(name, (posthog) =>
        posthog.capture({ distinctId, event: name, properties }),
    );
}

/**
 * A server event about a reading, whose owner is looked up here: the caller
 * often runs after a redirect and only has the reading's id.
 */
export async function captureReadingEvent(
    name: string,
    readingId: string,
    properties: Record<string, string | number | boolean>,
): Promise<void> {
    try {
        const found = await db.execute(
            sql`select user_id from readings where id = ${readingId} limit 1`,
        );
        const userId = found.rows[0]?.user_id;
        if (typeof userId !== "string") return;
        await captureServerEvent(name, userId, {
            ...properties,
            reading_id: readingId,
        });
    } catch (error) {
        logger.warn(
            "PostHog event {name} for reading {readingId} not sent: {error}",
            {
                name,
                readingId,
                error,
            },
        );
    }
}
