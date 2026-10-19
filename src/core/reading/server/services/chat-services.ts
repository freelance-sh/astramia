import "server-only";
import { ServerConfig } from "@/config/server-config";
import { stream } from "@/core/ai/server/repository/llm";
import { recordEvent } from "@/core/analytics/server/repository/events";
import { planFor } from "@/core/reading/domain/plans";
import { AI_TASKS, chatSystemPrompt } from "@/core/reading/domain/prompts";
import { CHAT_LIMITS } from "@/core/reading/domain/schemas";
import type { ChatMessage } from "@/core/reading/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import {
    addChatTurn,
    findReading,
    listChatMessages,
    startChatWindow,
} from "../repository/readings";
import { toChatMessage, toProfile } from "../repository/utils";

const HOUR_MS = 60 * 60 * 1000;

export async function listChatMessagesService(
    userId: string,
    readingId: string,
): AsyncAppResult<ChatMessage[]> {
    try {
        const row = await findReading(userId, readingId);
        if (!row) return err(AppErrors.notFound({ targets: ["reading"] }));
        if (!row.unlockedAt) return err(AppErrors.forbidden());
        const messages = await listChatMessages(readingId);
        return ok(messages.map(toChatMessage));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}

/**
 * One chat turn: checks the paid window and the message cap and streams the
 * answer. Question and answer are stored together once the answer finishes.
 * The first question opens the window: the hours run from there.
 */
export async function sendChatMessageService(
    userId: string,
    readingId: string,
    text: string,
): AsyncAppResult<ReturnType<typeof stream>> {
    try {
        const row = await findReading(userId, readingId);
        if (!row) return err(AppErrors.notFound({ targets: ["reading"] }));
        if (!row.unlockedAt) return err(AppErrors.forbidden());
        if (!row.content)
            return err(AppErrors.conflict({ targets: ["content"] }));
        if (row.chatExpiresAt && row.chatExpiresAt.getTime() < Date.now())
            return err(AppErrors.forbidden());

        const history = await listChatMessages(readingId);
        const asked = history.filter((m) => m.role === "user").length;
        if (asked >= CHAT_LIMITS.maxUserMessages)
            return err(AppErrors.tooManyRequests());

        const askedAt = new Date();
        if (!row.chatExpiresAt)
            await startChatWindow(
                readingId,
                new Date(askedAt.getTime() + CHAT_LIMITS.hours * HOUR_MS),
            );
        return ok(
            stream({
                model: ServerConfig.ai.models.chat,
                system: chatSystemPrompt(
                    toProfile(row),
                    row.content,
                    row.teaser,
                    askedAt,
                    planFor(row.topic),
                ),
                messages: [
                    ...history.map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                    { role: "user" as const, content: text },
                ],
                ...AI_TASKS.chat,
                usage: { purpose: "chat", userId, referenceId: readingId },
                onText: async (reply) => {
                    await addChatTurn(
                        readingId,
                        { content: text, askedAt },
                        reply,
                    );
                    await recordEvent("chat_reply", {
                        userId,
                        readingId,
                        props: {
                            ms: Date.now() - askedAt.getTime(),
                            turn: asked + 1,
                            asked: text.length,
                            answered: reply.length,
                        },
                    });
                },
            }),
        );
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
