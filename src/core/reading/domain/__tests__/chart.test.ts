import { describe, expect, it } from "vitest";
import {
    approximateDate,
    aspectsBetween,
    dominantElement,
    isTimeZone,
    natalChart,
    venusOutlook,
} from "../chart";
import type { NatalPlacement } from "../types";

const at = (
    body: string,
    longitude: number,
    element: NatalPlacement["element"] = "fuego",
): NatalPlacement => ({ body, sign: "", degree: "", element, longitude });

describe("aspectsBetween", () => {
    it("finds aspects across 0° Aries, tightest first", () => {
        const aspects = aspectsBetween([
            at("Sol", 358),
            at("Venus", 3),
            at("Marte", 92),
        ]);
        expect(aspects).toEqual([
            { a: "Venus", b: "Marte", name: "cuadratura", orb: 1 },
            { a: "Sol", b: "Marte", name: "cuadratura", orb: 4 },
            { a: "Sol", b: "Venus", name: "conjunción", orb: 5 },
        ]);
    });

    it("ignores angles outside every orb", () => {
        expect(aspectsBetween([at("Sol", 0), at("Luna", 30)])).toEqual([]);
    });
});

describe("dominantElement", () => {
    it("returns the majority element, or null on a tie", () => {
        expect(
            dominantElement([at("a", 0), at("b", 0), at("c", 0, "agua")]),
        ).toBe("fuego");
        expect(dominantElement([at("a", 0), at("b", 0, "agua")])).toBeNull();
    });
});

describe("natalChart", () => {
    it("is certain about the Moon when the birth time is known", () => {
        const chart = natalChart("1994-03-21", "08:30");
        expect(chart.placements.map((p) => p.sign)).toEqual([
            "Aries",
            "Cáncer",
            "Aries",
            "Piscis",
        ]);
        expect(chart.moonRange).toBeNull();
        expect(chart.aspects).toContainEqual(
            expect.objectContaining({
                a: "Luna",
                b: "Venus",
                name: "cuadratura",
            }),
        );
    });

    it("flags a Moon that changed sign on an unknown-time birthday", () => {
        const chart = natalChart("1992-05-08", null);
        expect(chart.moonRange).toEqual({ early: "Cáncer", late: "Leo" });
        // Its position is a guess, so no aspect may rest on it.
        expect(
            chart.aspects.some((a) => a.a === "Luna" || a.b === "Luna"),
        ).toBe(false);
    });
});

describe("venusOutlook", () => {
    it("matches the October–November 2026 Venus retrograde", () => {
        const outlook = venusOutlook(
            new Date("2026-10-14T15:00:00Z"),
            { sun: "Libra", moon: "Tauro", venus: "Virgo" },
            60,
        );
        expect(outlook).toMatchObject({ sign: "Escorpio", retrograde: true });
        expect(outlook.events).toEqual([
            {
                when: "finales de octubre",
                text: "Venus entra en Libra (tu signo solar)",
                kind: "entra",
                sign: "Libra",
                month: 9,
                mine: ["Sol"],
                day: 11,
                date: "2026-10-25",
            },
            {
                when: "mediados de noviembre",
                text: "Venus retoma su marcha directa en Libra (tu signo solar)",
                kind: "directa",
                sign: "Libra",
                month: 10,
                mine: ["Sol"],
                day: 32,
                date: "2026-11-15",
            },
            {
                // JPL: back in Scorpio on 4 December, 04:00 in Lima.
                when: "principios de diciembre",
                text: "Venus entra en Escorpio",
                kind: "entra",
                sign: "Escorpio",
                month: 11,
                mine: [],
                day: 51,
                date: "2026-12-04",
            },
        ]);
    });
});

describe("approximateDate", () => {
    it("rounds to a third of the month", () => {
        expect(approximateDate(new Date("2026-11-03T12:00:00Z"))).toBe(
            "principios de noviembre",
        );
        expect(approximateDate(new Date("2026-11-30T12:00:00Z"))).toBe(
            "finales de noviembre",
        );
    });
});

describe("birth time zone", () => {
    const moon = (date: string, time: string | null, zone?: string | null) =>
        natalChart(date, time, zone).placements[1].longitude;

    it("reads Lima's 1994 summer time (UTC−4), which a fixed UTC−5 missed", () => {
        expect(moon("1994-03-21", "08:30", "America/Lima")).toBeCloseTo(
            moon("1994-03-21", "08:30", "Etc/GMT+4"),
        );
        expect(moon("1994-03-21", "08:30", "America/Lima")).not.toBeCloseTo(
            moon("1994-03-21", "08:30", "Etc/GMT+5"),
        );
    });

    it("places the same clock time six hours earlier in Madrid", () => {
        // The Moon moves ~0.55°/h: 6 h earlier is ~3.3° behind.
        const behind =
            moon("1995-08-14", "07:30", "America/Lima") -
            moon("1995-08-14", "07:30", "Europe/Madrid");
        expect(behind).toBeGreaterThan(2.5);
        expect(behind).toBeLessThan(4.5);
    });

    it("falls back to Lima for a missing or unknown zone", () => {
        const lima = moon("1995-08-14", "07:30", "America/Lima");
        expect(moon("1995-08-14", "07:30", null)).toBeCloseTo(lima);
        expect(moon("1995-08-14", "07:30", "Mars/Olympus")).toBeCloseTo(lima);
        expect(isTimeZone("Mars/Olympus")).toBe(false);
        expect(isTimeZone("America/Bogota")).toBe(true);
    });
});
