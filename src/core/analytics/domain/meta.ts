/**
 * The Meta Pixel every event is measured with (Business Manager → Events).
 * Shared by the browser's pixel and the server's Conversions API copy, which
 * must name the same pixel to be talking about the same thing.
 */
export const META_PIXEL_ID = "1653247253123702";

/**
 * The id Meta dedupes a browser event and its server copy by. A reading is
 * paid once, so its id names its Purchase on both sides; if this changes,
 * every purchase counts twice.
 */
export function metaEventId(name: string, readingId: string): string {
    return `${name.toLowerCase()}-${readingId}`;
}
