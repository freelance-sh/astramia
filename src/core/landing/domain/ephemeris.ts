/**
 * Low-precision ephemeris for the landing's "cielo de hoy" strip.
 *
 * Sun and Moon follow the truncated series in Meeus, *Astronomical
 * Algorithms* (ch. 25 and 47); the planets use JPL's approximate Keplerian
 * elements (valid 1800–2050), brought to the equinox of date. Against JPL's
 * DE421 over 1930–2045: Sun 0.01°, Moon 0.1°, planets ≲0.2°. Pure and
 * side-effect free.
 */

import { longitudeToSign, type SignPosition } from "./zodiac";

const DEG = Math.PI / 180;
const J2000 = 2451545;

const norm360 = (deg: number) => ((deg % 360) + 360) % 360;
const sin = (deg: number) => Math.sin(deg * DEG);
const cos = (deg: number) => Math.cos(deg * DEG);

/** Julian Day for a JS Date (UTC). */
export function julianDay(date: Date): number {
    return date.getTime() / 86_400_000 + 2_440_587.5;
}

/** Julian centuries since J2000.0 */
const centuries = (jd: number) => (jd - J2000) / 36525;

/** Apparent geocentric ecliptic longitude of the Sun, degrees. */
export function sunLongitude(jd: number): number {
    const T = centuries(jd);
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const C =
        (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) +
        (0.019993 - 0.000101 * T) * sin(2 * M) +
        0.000289 * sin(3 * M);
    const omega = 125.04 - 1934.136 * T;
    return norm360(L0 + C - 0.00569 - 0.00478 * sin(omega));
}

/** Geocentric ecliptic longitude of the Moon, degrees (±0.3°). */
export function moonLongitude(jd: number): number {
    const T = centuries(jd);
    const Lp = 218.3164477 + 481267.88123421 * T;
    const D = 297.8501921 + 445267.1114034 * T;
    const M = 357.5291092 + 35999.0502909 * T;
    const Mp = 134.9633964 + 477198.8675055 * T;
    const F = 93.272095 + 483202.0175233 * T;
    const correction =
        6.288774 * sin(Mp) +
        1.274027 * sin(2 * D - Mp) +
        0.658314 * sin(2 * D) +
        0.213618 * sin(2 * Mp) -
        0.185116 * sin(M) -
        0.114332 * sin(2 * F) +
        0.058793 * sin(2 * D - 2 * Mp) +
        0.057066 * sin(2 * D - M - Mp) +
        0.053322 * sin(2 * D + Mp) +
        0.045758 * sin(2 * D - M) -
        0.040923 * sin(M - Mp) -
        0.03472 * sin(D) -
        0.030383 * sin(M + Mp);
    return norm360(Lp + correction);
}

interface KeplerElements {
    a: [number, number];
    e: [number, number];
    i: [number, number];
    L: [number, number];
    peri: [number, number];
    node: [number, number];
}

// JPL approximate elements, Table 1 (1800 AD – 2050 AD): value, rate per century.
const EARTH: KeplerElements = {
    a: [1.00000261, 0.00000562],
    e: [0.01671123, -0.00004392],
    i: [-0.00001531, -0.01294668],
    L: [100.46457166, 35999.37244981],
    peri: [102.93768193, 0.32327364],
    node: [0, 0],
};

const VENUS: KeplerElements = {
    a: [0.72333566, 0.0000039],
    e: [0.00677672, -0.00004107],
    i: [3.39467605, -0.0007889],
    L: [181.9790995, 58517.81538729],
    peri: [131.60246718, 0.00268329],
    node: [76.67984255, -0.27769418],
};

const MARS: KeplerElements = {
    a: [1.52371034, 0.00001847],
    e: [0.0933941, 0.00007882],
    i: [1.84969142, -0.00813131],
    L: [-4.55343205, 19140.30268499],
    peri: [-23.94362959, 0.44441088],
    node: [49.55953891, -0.29257343],
};

const MERCURY: KeplerElements = {
    a: [0.38709927, 0.00000037],
    e: [0.20563593, 0.00001906],
    i: [7.00497902, -0.00594749],
    L: [252.2503235, 149472.67411175],
    peri: [77.45779628, 0.16047689],
    node: [48.33076593, -0.12534081],
};

const JUPITER: KeplerElements = {
    a: [5.202887, -0.00011607],
    e: [0.04838624, -0.00013253],
    i: [1.30439695, -0.00183714],
    L: [34.39644051, 3034.74612775],
    peri: [14.72847983, 0.21252668],
    node: [100.47390909, 0.20469106],
};

const SATURN: KeplerElements = {
    a: [9.53667594, -0.0012506],
    e: [0.05386179, -0.00050991],
    i: [2.48599187, 0.00193609],
    L: [49.95424423, 1222.49362201],
    peri: [92.59887831, -0.41897216],
    node: [113.66242448, -0.28867794],
};

const URANUS: KeplerElements = {
    a: [19.18916464, -0.00196176],
    e: [0.04725744, -0.00004397],
    i: [0.77263783, -0.00242939],
    L: [313.23810451, 428.48202785],
    peri: [170.9542763, 0.40805281],
    node: [74.01692503, 0.04240589],
};

const NEPTUNE: KeplerElements = {
    a: [30.06992276, 0.00026291],
    e: [0.00859048, 0.00005105],
    i: [1.77004347, 0.00035372],
    L: [-55.12002969, 218.45945325],
    peri: [44.96476227, -0.32241464],
    node: [131.78422574, -0.00508664],
};

const PLUTO: KeplerElements = {
    a: [39.48211675, -0.00031596],
    e: [0.2488273, 0.0000517],
    i: [17.14001206, 0.00004818],
    L: [238.92903833, 145.20780515],
    peri: [224.06891629, -0.04062942],
    node: [110.30393684, -0.01183482],
};

interface Vec3 {
    x: number;
    y: number;
    z: number;
}

/** Heliocentric ecliptic (J2000) position in AU. */
function heliocentric(el: KeplerElements, T: number): Vec3 {
    const at = (p: [number, number]) => p[0] + p[1] * T;
    const a = at(el.a);
    const e = at(el.e);
    const i = at(el.i);
    const L = at(el.L);
    const peri = at(el.peri);
    const node = at(el.node);

    const omega = peri - node;
    const M = norm360(L - peri);

    // Kepler's equation, Newton iterations in degrees.
    const eStar = e / DEG;
    let E = M + eStar * sin(M);
    for (let k = 0; k < 8; k++) {
        const dM = M - (E - eStar * sin(E));
        const dE = dM / (1 - e * cos(E));
        E += dE;
        if (Math.abs(dE) < 1e-7) break;
    }

    const xp = a * (cos(E) - e);
    const yp = a * Math.sqrt(1 - e * e) * sin(E);

    const cw = cos(omega);
    const sw = sin(omega);
    const cn = cos(node);
    const sn = sin(node);
    const ci = cos(i);
    const si = sin(i);

    return {
        x: (cw * cn - sw * sn * ci) * xp + (-sw * cn - cw * sn * ci) * yp,
        y: (cw * sn + sw * cn * ci) * xp + (-sw * sn + cw * cn * ci) * yp,
        z: sw * si * xp + cw * si * yp,
    };
}

/**
 * Geocentric longitude of date, as the zodiac counts it: the elements give
 * it against the equinox of 2000, which precession moves 1.4° a century
 * (half a degree for someone born in 1965).
 */
function geocentricLongitude(el: KeplerElements, jd: number): number {
    const T = centuries(jd);
    const planet = heliocentric(el, T);
    const earth = heliocentric(EARTH, T);
    const lon = Math.atan2(planet.y - earth.y, planet.x - earth.x) / DEG;
    return norm360(lon + 1.396971 * T + 0.0003086 * T * T);
}

export const venusLongitude = (jd: number) => geocentricLongitude(VENUS, jd);
export const marsLongitude = (jd: number) => geocentricLongitude(MARS, jd);
export const mercuryLongitude = (jd: number) =>
    geocentricLongitude(MERCURY, jd);
export const jupiterLongitude = (jd: number) =>
    geocentricLongitude(JUPITER, jd);
export const saturnLongitude = (jd: number) => geocentricLongitude(SATURN, jd);
export const uranusLongitude = (jd: number) => geocentricLongitude(URANUS, jd);
export const neptuneLongitude = (jd: number) =>
    geocentricLongitude(NEPTUNE, jd);
export const plutoLongitude = (jd: number) => geocentricLongitude(PLUTO, jd);

/** Greenwich mean sidereal time, degrees (Meeus 12.4). */
export function siderealTime(jd: number): number {
    const T = centuries(jd);
    return norm360(
        280.46061837 +
            360.98564736629 * (jd - J2000) +
            0.000387933 * T * T -
            (T * T * T) / 38710000,
    );
}

/**
 * The degree of the zodiac rising on the eastern horizon at that instant
 * and place: the Ascendant. Latitude north and longitude east positive.
 * It moves a sign every two hours or so: the birth time matters.
 */
export function ascendant(jd: number, latitude: number, longitude: number) {
    const ramc = norm360(siderealTime(jd) + longitude);
    const eps = 23.439291 - 0.0130042 * centuries(jd);
    const asc = Math.atan2(
        cos(ramc),
        -(sin(ramc) * cos(eps) + Math.tan(latitude * DEG) * sin(eps)),
    );
    return norm360(asc / DEG);
}

/** A point in the plane of the ecliptic, in AU, the Sun at the origin. */
export interface OrbitPoint {
    x: number;
    y: number;
}

/**
 * Where Venus, the Earth and Mars were around the Sun: the same positions
 * their longitudes above are measured from, so a line from the Earth
 * through a planet points at the planet's sign.
 */
export function orbitPositions(jd: number): {
    venus: OrbitPoint;
    earth: OrbitPoint;
    mars: OrbitPoint;
} {
    const T = centuries(jd);
    const flat = ({ x, y }: Vec3): OrbitPoint => ({ x, y });
    return {
        venus: flat(heliocentric(VENUS, T)),
        earth: flat(heliocentric(EARTH, T)),
        mars: flat(heliocentric(MARS, T)),
    };
}

export type MoonPhaseName =
    | "Luna nueva"
    | "Luna creciente"
    | "Cuarto creciente"
    | "Gibosa creciente"
    | "Luna llena"
    | "Gibosa menguante"
    | "Cuarto menguante"
    | "Luna menguante";

export interface MoonPhase {
    /** 0 = new, 0.5 = full, 1 = new again */
    fraction: number;
    /** Illuminated portion of the disc, 0–1 */
    illumination: number;
    name: MoonPhaseName;
    waxing: boolean;
}

/** The cycle in order from the new Moon: phase `i` is `i / 8` of a lunar month. */
export const PHASE_NAMES: readonly MoonPhaseName[] = [
    "Luna nueva",
    "Luna creciente",
    "Cuarto creciente",
    "Gibosa creciente",
    "Luna llena",
    "Gibosa menguante",
    "Cuarto menguante",
    "Luna menguante",
];

/** Phase from Sun–Moon elongation. */
export function moonPhase(jd: number): MoonPhase {
    const elongation = norm360(moonLongitude(jd) - sunLongitude(jd));
    const fraction = elongation / 360;
    const illumination = (1 - cos(elongation)) / 2;
    const index = Math.round(fraction * 8) % 8;
    return {
        fraction,
        illumination,
        name: PHASE_NAMES[index],
        waxing: fraction < 0.5,
    };
}

export interface BodyReading {
    name: string;
    glyph: string;
    longitude: number;
    position: SignPosition;
}

export interface SkySnapshot {
    date: Date;
    sun: BodyReading;
    moon: BodyReading & { phase: MoonPhase };
    venus: BodyReading;
    mars: BodyReading;
}

/** Everything the "cielo de hoy" strip shows, computed for one instant. */
export function getSkySnapshot(date: Date): SkySnapshot {
    const jd = julianDay(date);
    const reading = (name: string, glyph: string, longitude: number) => ({
        name,
        glyph,
        longitude,
        position: longitudeToSign(longitude),
    });
    return {
        date,
        sun: reading("Sol", "☉", sunLongitude(jd)),
        moon: {
            ...reading("Luna", "☾", moonLongitude(jd)),
            phase: moonPhase(jd),
        },
        venus: reading("Venus", "♀", venusLongitude(jd)),
        mars: reading("Marte", "♂", marsLongitude(jd)),
    };
}
