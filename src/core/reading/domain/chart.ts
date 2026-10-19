import {
    ascendant,
    julianDay,
    jupiterLongitude,
    marsLongitude,
    mercuryLongitude,
    moonLongitude,
    moonPhase,
    neptuneLongitude,
    orbitPositions,
    plutoLongitude,
    saturnLongitude,
    sunLongitude,
    uranusLongitude,
    venusLongitude,
} from "@/core/landing/domain/ephemeris";
import {
    type Element,
    formatDegree,
    getSunSign,
    longitudeToSign,
    MONTHS_ES,
} from "@/core/landing/domain/zodiac";
import type {
    Aspect,
    AspectName,
    NatalChart,
    NatalPlacement,
    SkyEvent,
    VenusOutlook,
} from "./types";

/**
 * Everything the model may say about the sky is computed here, so a reading
 * interprets facts instead of inventing them. Pure; `now` is always passed in.
 */

/**
 * The launch market, for readings saved without a zone. Its IANA rules know
 * Peru's summer times (1986–87, 1990, 1994), which a fixed UTC−5 got wrong.
 * Unknown birth time → noon.
 */
export const DEFAULT_TIME_ZONE = "America/Lima";
const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export function isTimeZone(value: string): boolean {
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
        return true;
    } catch {
        return false;
    }
}

/** Minutes `timeZone` was ahead of UTC at `instant` (historical rules). */
function utcOffsetMinutes(timeZone: string, instant: number): number {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
    }).formatToParts(new Date(instant));
    const get = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find((p) => p.type === type)?.value);
    const wall = Date.UTC(
        get("year"),
        get("month") - 1,
        get("day"),
        get("hour"),
        get("minute"),
        get("second"),
    );
    return (wall - instant) / MINUTE_MS;
}

/** When a wall-clock date and time in `timeZone` happened. */
export function localInstant(
    birthDate: string,
    time: string,
    timeZone: string,
): Date {
    const [hours, minutes] = time.split(":").map(Number);
    const [y, m, d] = birthDate.split("-").map(Number);
    const zone = isTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;
    const wall = Date.UTC(y, m - 1, d, hours, minutes);
    // The second pass settles a time near a summer-time change.
    const guess = wall - utcOffsetMinutes(zone, wall) * MINUTE_MS;
    return new Date(wall - utcOffsetMinutes(zone, guess) * MINUTE_MS);
}

function placement(body: string, longitude: number): NatalPlacement {
    const position = longitudeToSign(longitude);
    return {
        body,
        sign: position.sign.name,
        degree: formatDegree(position),
        element: position.sign.element,
        longitude,
    };
}

/** Sun, Moon, Venus and Mars at birth, low precision but enough for signs. */
export function natalPlacements(
    birthDate: string,
    birthTime?: string | null,
    timeZone: string = DEFAULT_TIME_ZONE,
): NatalPlacement[] {
    const jd = julianDay(
        localInstant(birthDate, birthTime ?? "12:00", timeZone),
    );
    return [
        placement("Sol", sunLongitude(jd)),
        placement("Luna", moonLongitude(jd)),
        placement("Venus", venusLongitude(jd)),
        placement("Marte", marsLongitude(jd)),
    ];
}

/** Every body a reading may use, the Sun to Pluto. */
export const BODIES = [
    "Sol",
    "Luna",
    "Mercurio",
    "Venus",
    "Marte",
    "Júpiter",
    "Saturno",
    "Urano",
    "Neptuno",
    "Plutón",
] as const;
export type Body = (typeof BODIES)[number];

const LONGITUDE: Record<Body, (jd: number) => number> = {
    Sol: sunLongitude,
    Luna: moonLongitude,
    Mercurio: mercuryLongitude,
    Venus: venusLongitude,
    Marte: marsLongitude,
    Júpiter: jupiterLongitude,
    Saturno: saturnLongitude,
    Urano: uranusLongitude,
    Neptuno: neptuneLongitude,
    Plutón: plutoLongitude,
};

/** Where these bodies were at a Julian day. */
export function placementsAt(
    jd: number,
    bodies: readonly Body[] = BODIES,
): NatalPlacement[] {
    return bodies.map((body) => placement(body, LONGITUDE[body](jd)));
}

/** Bodies at birth (noon without a time), for the readings past love. */
export function birthPlacements(
    birth: { birthDate: string; birthTime: string | null },
    timeZone: string | null,
    bodies: readonly Body[] = BODIES,
): NatalPlacement[] {
    const jd = julianDay(
        localInstant(
            birth.birthDate,
            birth.birthTime ?? "12:00",
            timeZone ?? DEFAULT_TIME_ZONE,
        ),
    );
    return placementsAt(jd, bodies);
}

/**
 * The traditional ruler of each sign: the body an Ascendant in it "follows"
 * (the modern Pluto, Uranus and Neptune move too slowly to say anything
 * personal).
 */
export const RULERS: Record<string, Body> = {
    Aries: "Marte",
    Tauro: "Venus",
    Géminis: "Mercurio",
    Cáncer: "Luna",
    Leo: "Sol",
    Virgo: "Mercurio",
    Libra: "Venus",
    Escorpio: "Marte",
    Sagitario: "Júpiter",
    Capricornio: "Saturno",
    Acuario: "Saturno",
    Piscis: "Júpiter",
};

export interface Rising extends NatalPlacement {
    /**
     * The sign it would be with the birth time 20 minutes off, when that
     * changes it: the Ascendant moves a sign every two hours or so.
     */
    near: string | null;
}

/** The Ascendant: the sign rising in the east where and when they were born. */
export function risingSign(
    birthDate: string,
    birthTime: string,
    timeZone: string,
    latitude: number,
    longitude: number,
): Rising {
    const instant = localInstant(birthDate, birthTime, timeZone).getTime();
    const at = (minutes: number) =>
        ascendant(
            julianDay(new Date(instant + minutes * MINUTE_MS)),
            latitude,
            longitude,
        );
    const exact = placement("Ascendente", at(0));
    const near = [at(-20), at(20)]
        .map((l) => longitudeToSign(l).sign.name)
        .find((sign) => sign !== exact.sign);
    return { ...exact, near: near ?? null };
}

export function sunSignOf(birthDate: string): string {
    const [, m, d] = birthDate.split("-").map(Number);
    return getSunSign(m, d)?.name ?? "desconocido";
}

/** Major aspects with the usual orbs for a love reading. */
const ASPECTS: { name: AspectName; angle: number; orb: number }[] = [
    { name: "conjunción", angle: 0, orb: 8 },
    { name: "sextil", angle: 60, orb: 4 },
    { name: "cuadratura", angle: 90, orb: 6 },
    { name: "trígono", angle: 120, orb: 6 },
    { name: "oposición", angle: 180, orb: 8 },
];

/** Degrees between two longitudes, 0–180. */
export function separation(a: number, b: number): number {
    const diff = Math.abs(a - b) % 360;
    return diff > 180 ? 360 - diff : diff;
}

/** The aspect two longitudes make within these orbs, if any. */
export function aspectOf(
    a: number,
    b: number,
    orbs: readonly { name: AspectName; angle: number; orb: number }[] = ASPECTS,
): { name: AspectName; orb: number } | null {
    const apart = separation(a, b);
    const match = orbs.find((o) => Math.abs(apart - o.angle) <= o.orb);
    return match
        ? {
              name: match.name,
              orb: Math.round(Math.abs(apart - match.angle) * 10) / 10,
          }
        : null;
}

/** Aspects between every pair of placements, tightest first. */
export function aspectsBetween(placements: NatalPlacement[]): Aspect[] {
    const found: Aspect[] = [];
    placements.forEach((p, i) => {
        for (const q of placements.slice(i + 1)) {
            const match = aspectOf(p.longitude, q.longitude);
            if (match) found.push({ a: p.body, b: q.body, ...match });
        }
    });
    return found.sort((x, y) => x.orb - y.orb);
}

/** The element most placements share, or `null` when it's a tie. */
export function dominantElement(placements: NatalPlacement[]): Element | null {
    const counts = new Map<Element, number>();
    for (const p of placements)
        counts.set(p.element, (counts.get(p.element) ?? 0) + 1);
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return ranked.length === 1 || ranked[0][1] > ranked[1][1]
        ? ranked[0][0]
        : null;
}

export function natalChart(
    birthDate: string,
    birthTime: string | null,
    /** IANA zone the birth time is read in; `null` → `DEFAULT_TIME_ZONE`. */
    timeZone?: string | null,
): NatalChart {
    const zone = timeZone ?? DEFAULT_TIME_ZONE;
    const placements = natalPlacements(birthDate, birthTime, zone);
    const jd = julianDay(localInstant(birthDate, birthTime ?? "12:00", zone));
    const orbits = orbitPositions(jd);
    let moonRange: NatalChart["moonRange"] = null;
    if (!birthTime) {
        const early = longitudeToSign(
            moonLongitude(julianDay(localInstant(birthDate, "00:00", zone))),
        ).sign.name;
        const late = longitudeToSign(
            moonLongitude(julianDay(localInstant(birthDate, "23:59", zone))),
        ).sign.name;
        if (early !== late) moonRange = { early, late };
    }
    return {
        placements,
        // An unknown birth time moves the Moon up to ~6.5°: its aspects aren't reliable.
        aspects: aspectsBetween(
            birthTime
                ? placements
                : placements.filter((p) => p.body !== "Luna"),
        ),
        dominantElement: dominantElement(placements),
        moonPhase: moonPhase(jd).name,
        moonRange,
        orbits: {
            Venus: orbits.venus,
            Tierra: orbits.earth,
            Marte: orbits.mars,
        },
    };
}

/** "21 de marzo de 1994" from an ISO date. */
export function longDate(isoDate: string): string {
    const [y, m, d] = isoDate.split("-").map(Number);
    return `${d} de ${MONTHS_ES[m - 1]} de ${y}`;
}

/** "19 feb 2001", for small labels. */
export function shortDate(isoDate: string): string {
    const [y, m, d] = isoDate.split("-").map(Number);
    return `${d} ${MONTHS_ES[m - 1].slice(0, 3)} ${y}`;
}

/** "principios de noviembre": dates are ±1 day, so no false precision. */
export function approximateDate(date: Date): string {
    const day = date.getUTCDate();
    const part = day <= 10 ? "principios" : day <= 20 ? "mediados" : "finales";
    return `${part} de ${MONTHS_ES[date.getUTCMonth()]}`;
}

/** Signed daily motion in degrees, wrapping through 0° Aries. */
function motion(from: number, to: number): number {
    return ((to - from + 540) % 360) - 180;
}

/**
 * Venus after a reading written on `today`: what <cielo> tells the model and
 * the story draws, so both name the same moments. Without a birth time the
 * Moon's sign isn't flagged.
 */
export function readingOutlook(
    birth: {
        birthDate: string;
        birthTime: string | null;
        birthTimeZone: string | null;
    },
    today: Date,
): VenusOutlook {
    const [sun, moon, venus] = natalChart(
        birth.birthDate,
        birth.birthTime,
        birth.birthTimeZone,
    ).placements;
    const outlook = venusOutlook(today, {
        sun: sun.sign,
        moon: birth.birthTime ? moon.sign : "",
        venus: venus.sign,
    });
    // Four moments are enough to pick from; more and the model lists them all.
    return { ...outlook, events: outlook.events.slice(0, 4) };
}

/** How <cielo> says an event touches the person's chart. */
const MINE_TEXT = {
    Sol: "tu signo solar",
    Venus: "el signo de tu Venus",
    Luna: "el signo de tu Luna",
} as const;

/**
 * Venus over the next `days`: sign ingresses (flagging the person's own
 * signs) and retrograde stations, sampled daily at noon UTC.
 */
export function venusOutlook(
    now: Date,
    natal: { sun: string; moon: string; venus: string },
    days = 120,
): VenusOutlook {
    const noon = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        12,
    );
    const at = (i: number) =>
        venusLongitude(julianDay(new Date(noon + i * DAY_MS)));
    /** Which of the person's placements share `sign`. */
    const mine = (sign: string): SkyEvent["mine"] =>
        (
            [
                ["Sol", natal.sun],
                ["Venus", natal.venus],
                ["Luna", natal.moon],
            ] as const
        )
            .filter(([, natalSign]) => natalSign === sign)
            .map(([body]) => body);
    const event = (
        day: number,
        kind: SkyEvent["kind"],
        sign: string,
    ): SkyEvent => {
        const date = new Date(noon + day * DAY_MS);
        const tags = mine(sign);
        const verb = {
            entra: "entra en",
            retrograda: "empieza a retrogradar en",
            directa: "retoma su marcha directa en",
        }[kind];
        const owned = tags.length
            ? ` (${tags.map((body) => MINE_TEXT[body]).join(" y ")})`
            : "";
        return {
            when: approximateDate(date),
            text: `Venus ${verb} ${sign}${owned}`,
            kind,
            sign,
            month: date.getUTCMonth(),
            mine: tags,
            day,
            date: date.toISOString().slice(0, 10),
        };
    };

    const events: SkyEvent[] = [];
    let previous = at(0);
    let retrograde = motion(at(-1), previous) < 0;
    const startRetrograde = retrograde;
    for (let i = 1; i <= days; i++) {
        const current = at(i);
        const backwards = motion(previous, current) < 0;
        const sign = longitudeToSign(current).sign.name;
        if (backwards !== retrograde)
            events.push(event(i, backwards ? "retrograda" : "directa", sign));
        if (longitudeToSign(previous).sign.name !== sign)
            events.push(event(i, "entra", sign));
        retrograde = backwards;
        previous = current;
    }
    return {
        sign: longitudeToSign(at(0)).sign.name,
        retrograde: startRetrograde,
        events,
    };
}
