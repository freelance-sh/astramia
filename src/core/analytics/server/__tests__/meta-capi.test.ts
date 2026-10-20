import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/env", () => ({
    env: {
        META_CAPI_ACCESS_TOKEN: "token",
        META_CAPI_TEST_EVENT_CODE: "TEST123",
    },
}));

import { sendMetaPurchase } from "../meta-capi";

const fetchMock = vi.fn();

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ events_received: 1, fbtrace_id: "trace" }),
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("sendMetaPurchase", () => {
    it("sends the pixel's eventID with the amount, the currency and hashed data", async () => {
        await sendMetaPurchase({
            eventId: "purchase-r1",
            value: 19.9,
            currency: "PEN",
            email: " Buyer@Example.com ",
            externalId: "u1",
            eventSourceUrl: "https://astramia.app/lectura/r/r1",
        });

        expect(fetchMock).toHaveBeenCalledOnce();
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toContain("/1653247253123702/events");
        const body = JSON.parse(String(init.body));
        expect(body.test_event_code).toBe("TEST123");
        expect(body.data[0]).toMatchObject({
            event_name: "Purchase",
            event_id: "purchase-r1",
            action_source: "website",
            event_source_url: "https://astramia.app/lectura/r/r1",
            custom_data: { value: 19.9, currency: "PEN" },
        });
        // Normalized, then hashed: Meta matches the buyer, not their inbox.
        expect(body.data[0].user_data.em[0]).toMatch(/^[a-f0-9]{64}$/);
        expect(body.data[0].user_data.external_id).toHaveLength(1);
    });

    it("never throws when Meta is down", async () => {
        fetchMock.mockRejectedValue(new Error("network"));

        await expect(
            sendMetaPurchase({
                eventId: "purchase-r2",
                value: 19.9,
                currency: "PEN",
                eventSourceUrl: "https://astramia.app/lectura/r/r2",
            }),
        ).resolves.toBeUndefined();
    });
});
