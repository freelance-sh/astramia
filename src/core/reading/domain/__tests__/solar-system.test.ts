import { describe, expect, it } from "vitest";
import { longitudeToSign } from "@/core/landing/domain/zodiac";
import { natalChart, venusOutlook } from "../chart";
import { SAMPLE_READING } from "../sample-reading";
import {
    BAND,
    type Point,
    sightOn,
    solarSystemView,
    venusRoute,
} from "../solar-system";
import type { StoryBody } from "../story";

const chart = natalChart(
    SAMPLE_READING.birthDate,
    SAMPLE_READING.birthTime,
    SAMPLE_READING.birthTimeZone,
);
const view = solarSystemView(chart);

/** The longitude of the direction from `a` to `b`, on screen (y down). */
const angle = (a: Point, b: Point) =>
    ((((Math.atan2(-(b.y - a.y), b.x - a.x) * 180) / Math.PI) % 360) + 360) %
    360;

describe("the solar system of their birthday", () => {
    it("meets the band in the direction it was asked for", () => {
        const from = { x: 0.2, y: -0.25 };
        const hit = sightOn(from, 75, BAND.inner);
        expect(Math.hypot(hit.x, hit.y)).toBeCloseTo(BAND.inner, 9);
        expect(angle(from, hit)).toBeCloseTo(75, 9);
    });

    it.each<StoryBody>([
        "Venus",
        "Marte",
        "Sol",
        "Luna",
    ])("draws the line from the Earth through %s onto its sign", (body) => {
        const { from, to } = view.sight(body);
        const at = view.bodies[body];
        // The body sits on the line, between the Earth and the band.
        const cross =
            (at.x - from.x) * (to.y - from.y) -
            (at.y - from.y) * (to.x - from.x);
        expect(cross).toBeCloseTo(0, 2);
        expect(Math.hypot(at.x - from.x, at.y - from.y)).toBeLessThan(
            Math.hypot(to.x - from.x, to.y - from.y),
        );
        // And the band there is the chart's sign.
        const sign = chart.placements.find((p) => p.body === body)?.sign;
        expect(longitudeToSign(angle(from, to)).sign.name).toBe(sign);
    });

    it("starts each sign on the band where the Earth sees it start", () => {
        const earth = view.bodies.Tierra;
        view.signs.forEach((sign, i) => {
            expect(angle(earth, sign.inner)).toBeCloseTo(i * 30, 2);
            expect(angle(earth, sign.outer)).toBeCloseTo(i * 30, 2);
        });
    });
});

describe("venusRoute", () => {
    const { events } = venusOutlook(
        new Date("2026-10-14T15:00:00Z"),
        { sun: "Libra", moon: "Tauro", venus: "Virgo" },
        60,
    );
    const route = venusRoute(events);

    it("follows Venus day by day, a little past the last moment", () => {
        // Back in Scorpio on day 51 (4 December, as JPL has it).
        expect(route?.venus).toHaveLength(51 + 12 + 1);
        expect(route?.stops).toEqual([11, 32, 51]);
    });

    it("sees Venus in the sign each moment names, that day", () => {
        for (const event of events)
            expect(route?.sign[event.day]).toBe(event.sign);
        // The day before it enters, it's still in the one it leaves.
        expect(route?.sign[10]).toBe("Escorpio");
    });

    it("keeps Venus and the Earth on their orbits", () => {
        const r = (p: { x: number; y: number }) => Math.hypot(p.x, p.y);
        for (const p of route?.venus ?? [])
            expect(r(p)).toBeCloseTo(route?.today.orbits.Venus ?? 0, 2);
        for (const p of route?.earth ?? [])
            expect(r(p)).toBeCloseTo(route?.today.orbits.Tierra ?? 0, 1);
    });

    it("has none without moments", () => {
        expect(venusRoute([])).toBeNull();
    });
});
