import { aspectOf, type Body } from "./chart";
import type { AspectName, NatalPlacement } from "./types";

/**
 * Two charts read against each other (synastry): where one person's planets
 * touch the other's. Facts for the compatibility reading, computed here so
 * the model interprets them instead of inventing them.
 */

/** Who each one is, how they feel, talk, love and want. */
export const SYNASTRY_BODIES = [
    "Sol",
    "Luna",
    "Mercurio",
    "Venus",
    "Marte",
] as const satisfies readonly Body[];

/** Tighter than inside one chart: between two people, only what really touches. */
const ORBS = [
    { name: "conjunción", angle: 0, orb: 6 },
    { name: "sextil", angle: 60, orb: 4 },
    { name: "cuadratura", angle: 90, orb: 5 },
    { name: "trígono", angle: 120, orb: 5 },
    { name: "oposición", angle: 180, orb: 6 },
] as const;

export type Tone = "fluye" | "choca" | "funde";

const TONE: Record<AspectName, Tone> = {
    conjunción: "funde",
    sextil: "fluye",
    trígono: "fluye",
    cuadratura: "choca",
    oposición: "choca",
};

export interface CrossAspect {
    /** A body of the person reading. */
    mine: Body;
    /** A body of the other person. */
    theirs: Body;
    name: AspectName;
    orb: number;
    tone: Tone;
}

/**
 * The contacts that say most about a couple, either way round: attraction
 * (Venus–Mars), feeling at home (Sun–Moon, Moon–Moon), affection (Moon–Venus),
 * how they talk (Mercury–Mercury).
 */
const WEIGHT: Record<string, number> = {
    "Venus-Marte": 3,
    "Sol-Luna": 3,
    "Luna-Luna": 2,
    "Luna-Venus": 2,
    "Mercurio-Mercurio": 2,
    "Sol-Sol": 1.5,
    "Venus-Venus": 1.5,
    "Marte-Marte": 1.5,
    "Sol-Venus": 1.5,
    "Luna-Marte": 1.5,
};

const weightOf = (a: Body, b: Body) =>
    WEIGHT[`${a}-${b}`] ?? WEIGHT[`${b}-${a}`] ?? 1;

/**
 * Every contact between the two charts, the most telling first. A Moon
 * without its birth time can be ±6.5° off: its contacts are left out.
 */
export function crossAspects(
    mine: readonly NatalPlacement[],
    theirs: readonly NatalPlacement[],
    known: { mine: boolean; theirs: boolean },
): CrossAspect[] {
    const usable = (list: readonly NatalPlacement[], timed: boolean) =>
        list.filter(
            (p) =>
                (SYNASTRY_BODIES as readonly string[]).includes(p.body) &&
                (timed || p.body !== "Luna"),
        );
    const found: (CrossAspect & { rank: number })[] = [];
    for (const a of usable(mine, known.mine))
        for (const b of usable(theirs, known.theirs)) {
            const match = aspectOf(a.longitude, b.longitude, ORBS);
            if (!match) continue;
            const mineBody = a.body as Body;
            const theirBody = b.body as Body;
            found.push({
                mine: mineBody,
                theirs: theirBody,
                ...match,
                tone: TONE[match.name],
                // Tight and meaningful first: a weighty pair earns a wider orb.
                rank: match.orb - 2 * weightOf(mineBody, theirBody),
            });
        }
    return found
        .sort((x, y) => x.rank - y.rank)
        .map(({ rank: _, ...aspect }) => aspect);
}

/** The tightest-ranked contact of a tone, if any. */
export function strongest(
    aspects: readonly CrossAspect[],
    tone: Tone | readonly Tone[],
): CrossAspect | undefined {
    const tones: readonly Tone[] = typeof tone === "string" ? [tone] : tone;
    return aspects.find((a) => tones.includes(a.tone));
}
