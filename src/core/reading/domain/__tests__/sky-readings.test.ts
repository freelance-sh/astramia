import { describe, expect, it } from "vitest";
import {
    ascendant,
    julianDay,
    jupiterLongitude,
    marsLongitude,
    mercuryLongitude,
    neptuneLongitude,
    plutoLongitude,
    saturnLongitude,
    uranusLongitude,
    venusLongitude,
} from "@/core/landing/domain/ephemeris";
import { birthPlacements, risingSign } from "../chart";
import { crossAspects } from "../synastry";
import { pathEvents, transitsAt } from "../transits";
import type { NatalPlacement } from "../types";

/** Degrees from a to b, signed and wrapped. */
const off = (a: number, b: number) => ((a - b + 540) % 360) - 180;

// JPL's DE421, apparent geocentric longitude of date (skyfield), noon UTC.
const JPL = {
    "2026-10-19": {
        Mercurio: 229.63,
        Venus: 213.52,
        Marte: 132.09,
        Júpiter: 142.63,
        Saturno: 10.15,
        Urano: 65.09,
        Neptuno: 2.37,
        Plutón: 303.07,
    },
    "1990-06-15": {
        Mercurio: 65.69,
        Venus: 48.78,
        Marte: 11.04,
        Júpiter: 105.89,
        Saturno: 294.03,
        Urano: 278.17,
        Neptuno: 283.72,
        Plutón: 225.4,
    },
    "1965-02-03": {
        Mercurio: 300.19,
        Venus: 297.72,
        Marte: 177.85,
        Júpiter: 47.08,
        Saturno: 334.84,
        Urano: 163.96,
        Neptuno: 229.93,
        Plutón: 165.78,
    },
};
const OURS = {
    Mercurio: mercuryLongitude,
    Venus: venusLongitude,
    Marte: marsLongitude,
    Júpiter: jupiterLongitude,
    Saturno: saturnLongitude,
    Urano: uranusLongitude,
    Neptuno: neptuneLongitude,
    Plutón: plutoLongitude,
};

describe("planets", () => {
    for (const [date, bodies] of Object.entries(JPL))
        it(`match JPL within 0.2° on ${date}`, () => {
            const jd = julianDay(new Date(`${date}T12:00:00Z`));
            for (const [body, longitude] of Object.entries(bodies))
                expect(
                    Math.abs(
                        off(OURS[body as keyof typeof OURS](jd), longitude),
                    ),
                    body,
                ).toBeLessThan(0.2);
        });
});

describe("ascendant", () => {
    // The ecliptic meeting the eastern horizon in DE421 (skyfield).
    it.each([
        ["1997-11-14T13:30:00Z", -12.046, -77.043, 274.07],
        ["1985-07-21T03:10:00Z", -12.046, -77.043, 359.29],
        ["2001-02-19T07:45:00Z", 40.417, -3.704, 346.06],
    ])("at %s (%f, %f) is %f°", (iso, lat, lon, expected) => {
        const asc = ascendant(julianDay(new Date(iso)), lat, lon);
        expect(Math.abs(off(asc, expected))).toBeLessThan(0.1);
    });

    it("reads the birth time in the birthplace's zone, and flags a sign 20 minutes away", () => {
        // 08:30 in Lima is 13:30 UTC: 4° Capricorn, Sagittarius 20 minutes earlier.
        const rising = risingSign(
            "1997-11-14",
            "08:30",
            "America/Lima",
            -12.046,
            -77.043,
        );
        expect(rising.sign).toBe("Capricornio");
        expect(rising.near).toBe("Sagitario");
        // 22:10 in Lima: the last degree of Pisces, Aries 20 minutes later.
        const late = risingSign(
            "1985-07-20",
            "22:10",
            "America/Lima",
            -12.046,
            -77.043,
        );
        expect(late.sign).toBe("Piscis");
        expect(late.near).toBe("Aries");
    });
});

const at = (body: string, longitude: number): NatalPlacement => ({
    body,
    sign: "",
    degree: "",
    element: "fuego",
    longitude,
});

describe("synastry", () => {
    it("ranks attraction first and leaves out a Moon without its hour", () => {
        const mine = [at("Sol", 10), at("Luna", 100), at("Venus", 200)];
        const theirs = [at("Sol", 105), at("Luna", 10), at("Marte", 203)];
        const aspects = crossAspects(mine, theirs, {
            mine: true,
            theirs: false,
        });
        expect(aspects[0]).toMatchObject({
            mine: "Venus",
            theirs: "Marte",
            name: "conjunción",
            tone: "funde",
        });
        expect(aspects.some((a) => a.theirs === "Luna")).toBe(false);
        expect(aspects).toContainEqual(
            expect.objectContaining({
                mine: "Luna",
                theirs: "Sol",
                name: "conjunción",
            }),
        );
    });
});

describe("transits", () => {
    // Born 14 Nov 1997: Saturn in Aries at 14°, where it is again in 2027.
    const natal = birthPlacements(
        { birthDate: "1997-11-14", birthTime: "08:30" },
        "America/Lima",
    );

    it("finds the return of Saturn coming near 29", () => {
        const now = transitsAt(natal, new Date("2027-03-01T12:00:00Z"));
        expect(now).toContainEqual(
            expect.objectContaining({
                body: "Saturno",
                natal: "Saturno",
                name: "conjunción",
                cycle: true,
            }),
        );
    });

    it("dates the exact hits of the year ahead, in order", () => {
        const events = pathEvents(natal, new Date("2026-10-19T12:00:00Z"));
        expect(events.length).toBeGreaterThan(0);
        expect(events.map((e) => e.day)).toEqual(
            [...events.map((e) => e.day)].sort((a, b) => a - b),
        );
        const saturnReturn = events.find(
            (e) => e.body === "Saturno" && e.natal === "Saturno",
        );
        expect(saturnReturn?.when).toBe("mediados de marzo");
        expect(saturnReturn?.text).toContain("su retorno");
    });
});
