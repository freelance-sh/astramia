import { julianDay } from "@/core/landing/domain/ephemeris";
import { longitudeToSign } from "@/core/landing/domain/zodiac";
import { approximateDate, aspectOf, type Body, placementsAt } from "./chart";
import type { AspectName, NatalPlacement } from "./types";

/**
 * The slow planets over someone's chart (transits): what they're touching
 * now, and when they touch it exactly over the next year. Facts for the
 * "camino personal" reading, computed here so the model never invents a
 * transit or a date.
 */

export const SLOW = [
    "Júpiter",
    "Saturno",
    "Urano",
    "Neptuno",
    "Plutón",
] as const satisfies readonly Body[];
export type SlowBody = (typeof SLOW)[number];

/** The points a slow planet speaks to: the personal ones (and its own place). */
const PERSONAL = ["Sol", "Luna", "Mercurio", "Venus", "Marte", "Ascendente"];

const ORB: Record<SlowBody, number> = {
    Júpiter: 3,
    Saturno: 3,
    Urano: 2,
    Neptuno: 2,
    Plutón: 2,
};

/** How much a transit weighs: the planet, and the point it touches. */
const HEAVY: Record<SlowBody, number> = {
    Saturno: 5,
    Plutón: 5,
    Urano: 4,
    Neptuno: 4,
    Júpiter: 3,
};
const POINT: Record<string, number> = {
    Sol: 3,
    Luna: 3,
    Ascendente: 3,
    Venus: 2,
    Marte: 2,
    Mercurio: 1,
};

const DAY_MS = 24 * 60 * 60 * 1000;

export interface Transit {
    body: SlowBody;
    /** The natal point it touches ("Sol", "Ascendente", or its own body). */
    natal: string;
    name: AspectName;
    orb: number;
    /** Still getting closer (true) or already moving away. */
    applying: boolean;
    /**
     * Its own place at birth: a return, square or opposition to itself, the
     * cycles that mark ages (the return of Saturn near 29, of Jupiter every 12).
     */
    cycle: boolean;
}

export interface PathEvent {
    /** "principios de marzo": ±1 day, no false precision. */
    when: string;
    /** YYYY-MM-DD (UTC) and days after the reading's day, to draw it. */
    date: string;
    day: number;
    month: number;
    body: SlowBody;
    kind: "entra" | "retrograda" | "directa" | "exacto";
    sign: string;
    natal?: string;
    aspect?: AspectName;
    /** The sentence <cielo> gives the model. */
    text: string;
}

/** Only what a planet says something personal about. */
function speaksTo(body: SlowBody, natal: NatalPlacement): boolean {
    return PERSONAL.includes(natal.body) || natal.body === body;
}

/** Signed degrees from `exact` to `lon`, −180..180. */
const offset = (lon: number, exact: number) =>
    ((lon - exact + 540) % 360) - 180;

/** What the slow planets touch on `date`, the weightiest first. */
export function transitsAt(
    natal: readonly NatalPlacement[],
    date: Date,
): Transit[] {
    const now = placementsAt(julianDay(date), SLOW);
    const soon = placementsAt(
        julianDay(new Date(date.getTime() + 10 * DAY_MS)),
        SLOW,
    );
    const found: (Transit & { rank: number })[] = [];
    now.forEach((planet, i) => {
        const body = planet.body as SlowBody;
        const orbs = [
            { name: "conjunción", angle: 0, orb: ORB[body] },
            { name: "trígono", angle: 120, orb: ORB[body] },
            { name: "cuadratura", angle: 90, orb: ORB[body] },
            { name: "oposición", angle: 180, orb: ORB[body] },
        ] as const;
        for (const point of natal) {
            if (!speaksTo(body, point)) continue;
            const match = aspectOf(planet.longitude, point.longitude, orbs);
            // Its own cycle is marked by conjunction, square and opposition.
            if (!match || (point.body === body && match.name === "trígono"))
                continue;
            const later = aspectOf(soon[i].longitude, point.longitude, [
                {
                    name: match.name,
                    angle: orbs.find((o) => o.name === match.name)?.angle ?? 0,
                    orb: 180,
                },
            ]);
            const cycle = point.body === body;
            found.push({
                body,
                natal: point.body,
                ...match,
                applying: (later?.orb ?? match.orb) < match.orb,
                cycle,
                rank:
                    match.orb -
                    HEAVY[body] -
                    (cycle ? 3 : (POINT[point.body] ?? 1)),
            });
        }
    });
    return found
        .sort((x, y) => x.rank - y.rank)
        .map(({ rank: _, ...transit }) => transit);
}

const ANGLES: readonly { name: AspectName; angle: number }[] = [
    { name: "conjunción", angle: 0 },
    { name: "cuadratura", angle: 90 },
    { name: "trígono", angle: 120 },
    { name: "oposición", angle: 180 },
    { name: "trígono", angle: 240 },
    { name: "cuadratura", angle: 270 },
];

/** How <cielo> says an exact hit: on a point of theirs, or its own cycle. */
function exactText(body: SlowBody, natal: string, name: AspectName): string {
    if (natal !== body) return `${body} en ${name} exacta con tu ${natal}`;
    return name === "conjunción"
        ? `${body} vuelve exacto al lugar donde estaba cuando naciste (su retorno)`
        : `${body} en ${name} exacta con el lugar donde estaba cuando naciste`;
}

/** Which of the person's points sit in `sign`, said for <cielo>. */
function owned(natal: readonly NatalPlacement[], sign: string): string {
    const here = natal.filter(
        (p) => p.sign === sign && PERSONAL.includes(p.body),
    );
    return here.length
        ? ` (el signo de tu ${here.map((p) => p.body).join(" y tu ")})`
        : "";
}

/**
 * The slow planets over the next `days`: sign changes, stations, and the
 * days a transit is exact (a retrograde one can be exact three times),
 * sampled daily at noon UTC. The most telling first come, at most `limit`.
 */
export function pathEvents(
    natal: readonly NatalPlacement[],
    today: Date,
    days = 365,
    limit = 8,
): PathEvent[] {
    const noon = Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
        12,
    );
    const at = (i: number) =>
        placementsAt(julianDay(new Date(noon + i * DAY_MS)), SLOW);
    const event = (
        i: number,
        body: SlowBody,
        kind: PathEvent["kind"],
        sign: string,
        text: string,
        extra: Pick<PathEvent, "natal" | "aspect"> = {},
    ): PathEvent & { score: number } => {
        const date = new Date(noon + i * DAY_MS);
        // What's worth a moment in a reading: exact hits on its points first.
        const score =
            kind === "exacto"
                ? HEAVY[body] +
                  (extra.natal === body ? 3 : (POINT[extra.natal ?? ""] ?? 1))
                : kind === "entra"
                  ? HEAVY[body] - 1 + (owned(natal, sign) ? 2 : 0)
                  : HEAVY[body] - 3;
        return {
            when: approximateDate(date),
            date: date.toISOString().slice(0, 10),
            day: i,
            month: date.getUTCMonth(),
            body,
            kind,
            sign,
            text,
            ...extra,
            score,
        };
    };

    const found: (PathEvent & { score: number })[] = [];
    let previous = at(0);
    const backwards = SLOW.map(
        (_, k) => offset(previous[k].longitude, at(-1)[k].longitude) < 0,
    );
    for (let i = 1; i <= days; i++) {
        const current = at(i);
        SLOW.forEach((body, k) => {
            const before = previous[k].longitude;
            const now = current[k].longitude;
            const sign = longitudeToSign(now).sign.name;
            const retro = offset(now, before) < 0;
            if (retro !== backwards[k])
                found.push(
                    event(
                        i,
                        body,
                        retro ? "retrograda" : "directa",
                        sign,
                        retro
                            ? `${body} empieza a retrogradar en ${sign}`
                            : `${body} retoma su marcha directa en ${sign}`,
                    ),
                );
            backwards[k] = retro;
            if (longitudeToSign(before).sign.name !== sign)
                found.push(
                    event(
                        i,
                        body,
                        "entra",
                        sign,
                        `${body} entra en ${sign}${owned(natal, sign)}`,
                    ),
                );
            for (const point of natal) {
                if (!speaksTo(body, point)) continue;
                for (const { name, angle } of ANGLES) {
                    // The outer planets, and any planet's own cycle, only by
                    // conjunction, square and opposition.
                    if (
                        name === "trígono" &&
                        (point.body === body ||
                            (body !== "Júpiter" && body !== "Saturno"))
                    )
                        continue;
                    const exact = point.longitude + angle;
                    const a = offset(before, exact);
                    const b = offset(now, exact);
                    if (
                        Math.abs(a) < 2 &&
                        Math.sign(a) !== Math.sign(b) &&
                        b !== 0
                    )
                        found.push(
                            event(
                                i,
                                body,
                                "exacto",
                                sign,
                                exactText(body, point.body, name),
                                { natal: point.body, aspect: name },
                            ),
                        );
                }
            }
        });
        previous = current;
    }
    return found
        .sort((x, y) => y.score - x.score || x.day - y.day)
        .slice(0, limit)
        .sort((x, y) => x.day - y.day)
        .map(({ score: _, ...e }) => e);
}
