import { natalChart, readingOutlook } from "@/core/reading/domain/chart";
import { readingFacts } from "@/core/reading/domain/facts";
import { planFor } from "@/core/reading/domain/plans";
import { lockTeaser } from "@/core/reading/domain/reading-content";
import { storyQuestion } from "@/core/reading/domain/story";
import type {
    ChatMessage,
    Reading,
    ReadingProfile,
} from "@/core/reading/domain/types";
import type {
    ChatMessageRow,
    ReadingRow,
} from "@/server/drizzle/schemas/reading-schema";

/**
 * Row → wire. While the reading is locked, `content` stays on the server
 * and so does the hook's text past its free sentences.
 */
export function toReading(row: ReadingRow): Reading {
    const locked = row.unlockedAt === null;
    // The day its texts speak of: the slow planets the paid part read.
    const day = locked
        ? row.createdAt
        : (row.generatingAt ?? row.unlockedAt ?? row.createdAt);
    return {
        id: row.id,
        topic: row.topic,
        sunSign: row.sunSign,
        teaser: locked
            ? lockTeaser(row.teaser, planFor(row.topic))
            : row.teaser,
        birthDate: row.birthDate,
        birthTime: row.birthTime,
        birthPlace: row.birthPlace,
        chart: natalChart(row.birthDate, row.birthTime, row.birthTimeZone),
        locked,
        content: locked ? null : row.content,
        question: storyQuestion(row.answers, row.topic),
        // Texts written before `generatingAt` was kept: the checkout wrote
        // them, minutes from the unlock.
        skyAhead:
            locked || row.topic !== "amor"
                ? []
                : readingOutlook(row, day).events,
        facts: readingFacts(row.topic, toProfile(row), day),
        chatExpiresAt: row.chatExpiresAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
    };
}

export function toProfile(row: ReadingRow): ReadingProfile {
    return {
        topic: row.topic,
        birthDate: row.birthDate,
        birthTime: row.birthTime,
        birthTimeZone: row.birthTimeZone,
        birthPlace: row.birthPlace,
        birthLatitude: row.birthLatitude,
        birthLongitude: row.birthLongitude,
        partner: row.partner,
        answers: row.answers,
    };
}

export function toChatMessage(row: ChatMessageRow): ChatMessage {
    return {
        id: row.id,
        role: row.role,
        content: row.content,
        createdAt: row.createdAt.toISOString(),
    };
}
