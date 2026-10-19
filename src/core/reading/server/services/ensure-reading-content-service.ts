import "server-only";
import { getLogger } from "@logtape/logtape";
import { ServerConfig } from "@/config/server-config";
import { generateObject } from "@/core/ai/server/repository/llm";
import { recordEvent } from "@/core/analytics/server/repository/events";
import { planFor } from "@/core/reading/domain/plans";
import { AI_TASKS, paidPrompt } from "@/core/reading/domain/prompts";
import type { Reading } from "@/core/reading/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import type { ReadingRow } from "@/server/drizzle/schemas/reading-schema";
import {
    claimReadingGeneration,
    findReading,
    saveReadingContent,
} from "../repository/readings";
import { toProfile, toReading } from "../repository/utils";
import { reviewTexts } from "./review-texts";

const logger = getLogger(["server", "reading"]);

/** A claim older than this is considered abandoned (crashed request). */
const CLAIM_TTL_MS = 2 * 60 * 1000;

/**
 * Writes the full text once. Concurrent callers don't double-bill: only the
 * claimant generates; the others get `null` and the page polls.
 */
async function writeReadingContent(row: ReadingRow): Promise<string | null> {
    const claimed = await claimReadingGeneration(
        row.id,
        new Date(Date.now() - CLAIM_TTL_MS),
    );
    if (!claimed) return null;

    try {
        const started = Date.now();
        // One text per scene after the free ones, stored as JSON (see plan.ts).
        const prompt = paidPrompt(planFor(row.topic));
        const profile = toProfile(row);
        const written = await generateObject({
            model: ServerConfig.ai.models.reading,
            system: prompt.system,
            prompt: prompt.prompt(profile, row.teaser, new Date()),
            schema: prompt.schema,
            ...AI_TASKS.reading,
            usage: {
                purpose: "reading",
                userId: row.userId,
                referenceId: row.id,
            },
        });
        // A second look: nothing about their life their answers don't say.
        const scenes = await reviewTexts({
            schema: prompt.schema,
            profile,
            texts: written,
            usage: {
                purpose: "review",
                userId: row.userId,
                referenceId: row.id,
            },
        });
        const content = JSON.stringify(scenes);
        await saveReadingContent(row.id, content);
        await recordEvent("content_written", {
            userId: row.userId,
            readingId: row.id,
            props: { ms: Date.now() - started, paid: row.unlockedAt !== null },
        });
        return content;
    } catch (cause) {
        // Release the claim so the next open retries right away.
        await saveReadingContent(row.id, null);
        logger.error("Reading {id} generation failed: {cause}", {
            id: row.id,
            cause,
        });
        throw cause;
    }
}

/**
 * Returns the unlocked reading, writing the full text if nobody has yet.
 * `content: null` means it is being written elsewhere: the page polls.
 */
export async function ensureReadingContentService(
    userId: string,
    id: string,
): AsyncAppResult<Reading> {
    try {
        const row = await findReading(userId, id);
        if (!row) return err(AppErrors.notFound({ targets: ["reading"] }));
        const reading = toReading(row);
        if (reading.locked) return err(AppErrors.forbidden());
        if (reading.content) return ok(reading);
        return ok({ ...reading, content: await writeReadingContent(row) });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}

/**
 * Writes the full text ahead of payment, while the buyer fills in the
 * checkout, so it's ready when they come back instead of ~30 s later. It
 * stays on the server until the reading is unlocked (`toReading`).
 */
export async function prepareReadingContentService(
    userId: string,
    id: string,
): AsyncAppResult<void> {
    try {
        const row = await findReading(userId, id);
        if (!row) return err(AppErrors.notFound({ targets: ["reading"] }));
        if (!row.content) await writeReadingContent(row);
        return ok(undefined);
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
