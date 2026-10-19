import "server-only";
import type { Reading, ReadingSummary } from "@/core/reading/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findReading, listReadings } from "../repository/readings";
import { toReading } from "../repository/utils";

export async function getReadingService(
    userId: string,
    id: string,
): AsyncAppResult<Reading> {
    try {
        const row = await findReading(userId, id);
        if (!row) return err(AppErrors.notFound({ targets: ["reading"] }));
        return ok(toReading(row));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}

export async function listReadingsService(
    userId: string,
): AsyncAppResult<ReadingSummary[]> {
    try {
        const rows = await listReadings(userId);
        return ok(
            rows.map((row) => ({
                id: row.id,
                topic: row.topic,
                sunSign: row.sunSign,
                unlocked: row.unlockedAt !== null,
                createdAt: row.createdAt.toISOString(),
            })),
        );
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
