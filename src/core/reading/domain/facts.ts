import { julianDay } from "@/core/landing/domain/ephemeris";
import { ageOn } from "./age";
import {
    type Body,
    birthPlacements,
    DEFAULT_TIME_ZONE,
    placementsAt,
    type Rising,
    risingSign,
    sunSignOf,
} from "./chart";
import { type CrossAspect, crossAspects } from "./synastry";
import {
    type PathEvent,
    pathEvents,
    SLOW,
    type Transit,
    transitsAt,
} from "./transits";
import type { NatalPlacement, ReadingProfile, ReadingTopic } from "./types";

/**
 * The sky a reading past love stands on, computed once from the person's
 * birth (and the other person's, or the day it's read): what its prompts
 * hand the model and what its scenes draw, so both say the same thing.
 */
export interface ReadingFacts {
    /** Their bodies at birth, the Sun to Pluto (no Moon without a birth time). */
    bodies: NatalPlacement[];
    rising: Rising | null;
    partner: {
        birthDate: string;
        sunSign: string;
        /** Their bodies (no Moon without a birth time). */
        bodies: NatalPlacement[];
        timed: boolean;
    } | null;
    /** Between the two charts, the most telling first. */
    contacts: CrossAspect[];
    /** Their age on the day it's read. */
    age: number;
    /** Where the slow planets are on the day it's read. */
    sky: NatalPlacement[];
    /** What the slow planets touch on the day it's read, the weightiest first. */
    transits: Transit[];
    /** The slow planets' moments over the year ahead. */
    path: PathEvent[];
}

const PERSONAL: readonly Body[] = ["Sol", "Luna", "Mercurio", "Venus", "Marte"];

/** Without a birth time the Moon can be ±6.5° off: left out, not guessed. */
const timedOnly = (bodies: NatalPlacement[], timed: boolean) =>
    timed ? bodies : bodies.filter((p) => p.body !== "Luna");

export function readingFacts(
    topic: ReadingTopic,
    profile: ReadingProfile,
    /** The day it's read: what the slow planets are doing. */
    day: Date,
): ReadingFacts | null {
    if (topic === "amor") return null;
    const zone = profile.birthTimeZone ?? DEFAULT_TIME_ZONE;
    const timed = Boolean(profile.birthTime);
    const bodies = timedOnly(birthPlacements(profile, zone), timed);
    const rising =
        profile.birthTime &&
        profile.birthLatitude != null &&
        profile.birthLongitude != null
            ? risingSign(
                  profile.birthDate,
                  profile.birthTime,
                  zone,
                  profile.birthLatitude,
                  profile.birthLongitude,
              )
            : null;

    const partner =
        topic === "compatibilidad" && profile.partner
            ? {
                  birthDate: profile.partner.birthDate,
                  sunSign: sunSignOf(profile.partner.birthDate),
                  // Their hour, if known, read in the same zone as the reader's.
                  bodies: timedOnly(
                      birthPlacements(profile.partner, zone, PERSONAL),
                      Boolean(profile.partner.birthTime),
                  ),
                  timed: Boolean(profile.partner.birthTime),
              }
            : null;
    const contacts = partner
        ? crossAspects(bodies, partner.bodies, {
              mine: timed,
              theirs: partner.timed,
          })
        : [];

    // Transits need the natal points they touch, the Ascendant among them.
    const natal = rising ? [...bodies, rising] : bodies;
    const path = topic === "camino";
    return {
        bodies,
        rising,
        partner,
        contacts,
        age: ageOn(profile.birthDate, day),
        sky: path ? placementsAt(julianDay(day), SLOW) : [],
        transits: path ? transitsAt(natal, day) : [],
        path: path ? pathEvents(natal, day) : [],
    };
}
