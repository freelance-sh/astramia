import { beforeEach, describe, expect, it, vi } from "vitest";
import { CHAT_LIMITS } from "@/core/reading/domain/schemas";

vi.mock("@/core/ai/server/repository/llm", () => ({ stream: vi.fn() }));
vi.mock("../../repository/readings", () => ({
    addChatTurn: vi.fn(),
    findReading: vi.fn(),
    listChatMessages: vi.fn(),
    startChatWindow: vi.fn(),
}));

import { stream } from "@/core/ai/server/repository/llm";
import {
    addChatTurn,
    findReading,
    listChatMessages,
    startChatWindow,
} from "../../repository/readings";
import { sendChatMessageService } from "../chat-services";

const HOUR_MS = 60 * 60 * 1000;

const reading = {
    id: "r1",
    userId: "u1",
    topic: "amor" as const,
    birthDate: "1994-03-21",
    birthTime: null,
    birthTimeZone: null,
    birthPlace: null,
    birthLatitude: null,
    birthLongitude: null,
    partner: null,
    sunSign: "Aries",
    answers: [],
    teaser: "Gancho",
    content: "Lectura completa",
    generatingAt: null,
    unlockedAt: new Date(),
    chatExpiresAt: new Date(Date.now() + HOUR_MS),
    createdAt: new Date(),
    updatedAt: new Date(),
};

function message(role: "user" | "assistant", i: number) {
    return {
        id: `m${i}`,
        readingId: "r1",
        role,
        content: `${role} ${i}`,
        createdAt: new Date(),
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findReading).mockResolvedValue(reading);
    vi.mocked(listChatMessages).mockResolvedValue([]);
    vi.mocked(stream).mockReturnValue(
        {} as unknown as ReturnType<typeof stream>,
    );
});

describe("sendChatMessageService", () => {
    it("stores the question only together with the model's answer", async () => {
        const r = await sendChatMessageService("u1", "r1", "¿Y ahora?");

        expect(r.ok).toBe(true);
        // Nothing is written up front: a turn the model fails on costs no question.
        expect(addChatTurn).not.toHaveBeenCalled();

        const { onText } = vi.mocked(stream).mock.calls[0][0];
        await onText("Respuesta");
        expect(addChatTurn).toHaveBeenCalledWith(
            "r1",
            { content: "¿Y ahora?", askedAt: expect.any(Date) },
            "Respuesta",
        );
    });

    it("refuses once the question cap is reached", async () => {
        vi.mocked(listChatMessages).mockResolvedValue(
            Array.from({ length: CHAT_LIMITS.maxUserMessages }, (_, i) =>
                message("user", i),
            ),
        );

        const r = await sendChatMessageService("u1", "r1", "Una más");

        expect(r.ok).toBe(false);
        expect(stream).not.toHaveBeenCalled();
    });

    it("starts the paid hours with the first question, not the payment", async () => {
        vi.mocked(findReading).mockResolvedValue({
            ...reading,
            chatExpiresAt: null,
        });

        const before = Date.now();
        const r = await sendChatMessageService("u1", "r1", "Primera");

        expect(r.ok).toBe(true);
        const [id, expiresAt] = vi.mocked(startChatWindow).mock.calls[0];
        expect(id).toBe("r1");
        expect(expiresAt.getTime()).toBeGreaterThanOrEqual(
            before + CHAT_LIMITS.hours * HOUR_MS,
        );
    });

    it("leaves an open window as it is", async () => {
        await sendChatMessageService("u1", "r1", "Otra");
        expect(startChatWindow).not.toHaveBeenCalled();
    });

    it("refuses after the chat window closes", async () => {
        vi.mocked(findReading).mockResolvedValue({
            ...reading,
            chatExpiresAt: new Date(Date.now() - 1000),
        });

        const r = await sendChatMessageService("u1", "r1", "Hola");

        expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
        expect(stream).not.toHaveBeenCalled();
    });
});
