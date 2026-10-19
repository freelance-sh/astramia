import "server-only";
import { ServerConfig } from "@/config/server-config";
import { generateObject } from "@/core/ai/server/repository/llm";
import { recordEvent } from "@/core/analytics/server/repository/events";
import { sunSignOf } from "@/core/reading/domain/chart";
import { planFor } from "@/core/reading/domain/plans";
import { AI_TASKS, freePrompt } from "@/core/reading/domain/prompts";
import { chosen } from "@/core/reading/domain/quiz";
import { FIRST_QUESTION } from "@/core/reading/domain/quizzes";
import { keepCutMark, keptFree } from "@/core/reading/domain/reading-content";
import { DAILY_READING_LIMIT } from "@/core/reading/domain/schemas";
import type { CreateReading } from "@/core/reading/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { countReadingsSince, createReading } from "../repository/readings";
import { reviewTexts } from "./review-texts";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Saves the questionnaire and writes the free scenes of its plan. */
export async function createReadingService(
    userId: string,
    input: CreateReading,
): AsyncAppResult<{ id: string }> {
    try {
        const recent = await countReadingsSince(
            userId,
            new Date(Date.now() - DAY_MS),
        );
        if (recent >= DAILY_READING_LIMIT)
            return err(AppErrors.tooManyRequests());

        const profile = {
            topic: input.topic,
            birthDate: input.birthDate,
            birthTime: input.birthTime ?? null,
            birthTimeZone: input.birthTimeZone ?? null,
            birthPlace: input.birthPlace ?? null,
            birthLatitude: input.birthLatitude ?? null,
            birthLongitude: input.birthLongitude ?? null,
            partner: input.partner
                ? {
                      birthDate: input.partner.birthDate,
                      birthTime: input.partner.birthTime ?? null,
                  }
                : null,
            answers: input.answers,
        };
        const id = crypto.randomUUID();
        const plan = planFor(input.topic);
        const prompt = freePrompt(plan);
        const started = Date.now();
        const written = await generateObject({
            model: ServerConfig.ai.models.teaser,
            system: prompt.system,
            prompt: prompt.prompt(profile, new Date()),
            schema: prompt.schema,
            ...AI_TASKS.teaser,
            usage: { purpose: "teaser", userId, referenceId: id },
        });
        const wrote = Date.now();
        // A second look: nothing about their life their answers don't say.
        const free = await reviewTexts({
            schema: prompt.schema,
            profile,
            texts: written,
            usage: { purpose: "review", userId, referenceId: id },
        });

        const row = await createReading({
            id,
            userId,
            ...profile,
            sunSign: sunSignOf(input.birthDate),
            teaser: JSON.stringify(
                keptFree(keepCutMark(written, free, plan), plan),
            ),
        });
        await recordEvent("reading_created", {
            userId,
            readingId: row.id,
            props: {
                topic: input.topic,
                question:
                    chosen(input.answers, FIRST_QUESTION[input.topic]) ?? null,
                ms: Date.now() - started,
                writeMs: wrote - started,
                reviewMs: Date.now() - wrote,
            },
        });
        return ok({ id: row.id });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
