import { describe, expect, it } from "vitest";
import { isPanelEmail } from "../admins";
import { BOT_AGENT, FOREIGN_ERROR, trackBatchSchema } from "../events";
import { formatSeconds, formatShare } from "../format";

describe("the panel's list", () => {
    it("lets in the team's addresses, however they're typed", () => {
        expect(isPanelEmail("hectorzerrillo85@gmail.com")).toBe(true);
        expect(isPanelEmail(" Santiago@Workin2.com ")).toBe(true);
        expect(isPanelEmail("sfrancobaanante@gmail.com")).toBe(true);
    });

    it("keeps everyone else out, look-alikes included", () => {
        expect(isPanelEmail("hectorzerrillo85@gmail.co")).toBe(false);
        expect(isPanelEmail("x.hectorzerrillo85@gmail.com")).toBe(false);
        expect(isPanelEmail(null)).toBe(false);
        expect(isPanelEmail("")).toBe(false);
    });
});

describe("a batch of browser events", () => {
    const batch = {
        visitorId: "visitor-123",
        sessionId: "session-123",
        events: [
            { name: "page_view", ago: 120, path: "/", props: { touch: true } },
        ],
    };

    it("takes short snake_case names and small props", () => {
        expect(trackBatchSchema.safeParse(batch).success).toBe(true);
    });

    it("refuses odd names, huge props and empty or oversized batches", () => {
        const withEvent = (event: object) => ({
            ...batch,
            events: [{ ...batch.events[0], ...event }],
        });
        expect(
            trackBatchSchema.safeParse(withEvent({ name: "Page View" }))
                .success,
        ).toBe(false);
        expect(
            trackBatchSchema.safeParse(
                withEvent({ props: { text: "x".repeat(501) } }),
            ).success,
        ).toBe(false);
        expect(
            trackBatchSchema.safeParse(
                withEvent({
                    props: Object.fromEntries(
                        Array.from({ length: 21 }, (_, i) => [`k${i}`, i]),
                    ),
                }),
            ).success,
        ).toBe(false);
        expect(
            trackBatchSchema.safeParse({ ...batch, events: [] }).success,
        ).toBe(false);
        expect(
            trackBatchSchema.safeParse({
                ...batch,
                events: Array(51).fill(batch.events[0]),
            }).success,
        ).toBe(false);
        expect(
            trackBatchSchema.safeParse(withEvent({ ago: 2 * 60 * 60 * 1000 }))
                .success,
        ).toBe(false);
    });

    it("tells crawlers and link previews from people", () => {
        expect(BOT_AGENT.test("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(
            true,
        );
        expect(BOT_AGENT.test("WhatsApp/2.23")).toBe(true);
        expect(
            BOT_AGENT.test(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
            ),
        ).toBe(false);
    });
});

describe("errors in the page", () => {
    it("leaves out the in-app browser's bridge and opaque cross-origin errors", () => {
        expect(
            FOREIGN_ERROR.test(
                "Uncaught Error: Error invoking postMessage: Java object is gone",
            ),
        ).toBe(true);
        expect(FOREIGN_ERROR.test("Script error.")).toBe(true);
    });

    it("keeps the errors from our own code", () => {
        expect(
            FOREIGN_ERROR.test(
                "TypeError: Cannot read properties of undefined (reading 'map')",
            ),
        ).toBe(false);
        expect(FOREIGN_ERROR.test("Script error in quiz step")).toBe(false);
    });
});

describe("numbers in the panel", () => {
    it("says shares and times plainly", () => {
        expect(formatShare(20, 53)).toBe("38 %");
        expect(formatShare(1, 160)).toBe("0.6 %");
        expect(formatShare(3, 0)).toBe("—");
        expect(formatSeconds(45)).toBe("45 s");
        expect(formatSeconds(324)).toBe("5 min 24 s");
        expect(formatSeconds(120)).toBe("2 min");
        expect(formatSeconds(null)).toBe("—");
    });
});
