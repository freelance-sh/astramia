import "server-only";
import { isTimeZone } from "@/core/reading/domain/chart";
import type { Place } from "@/core/reading/domain/types";

interface GeocodeResult {
    name: string;
    latitude: number;
    longitude: number;
    timezone?: string;
    admin1?: string;
    country?: string;
}

/**
 * The region, as people say it ("Antioquia", not "Departamento de
 * Antioquia"), and only when it adds something: not "Arequipa, Arequipa".
 */
function regionOf({ name, admin1 }: GeocodeResult): string | null {
    const region = admin1?.replace(
        /^(Departamento|Provincia|Estado|Región|Region) de(l)? /i,
        "",
    );
    return region && !region.toLowerCase().includes(name.toLowerCase())
        ? region
        : null;
}

/**
 * Cities by name, most populous first, from Open-Meteo's geocoder
 * (GeoNames data, free, no key), with the zone each one's birth time is read
 * in. Cached a day: the same names come up again and again.
 */
export async function searchPlaces(name: string): Promise<Place[]> {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", name);
    url.searchParams.set("count", "6");
    url.searchParams.set("language", "es");
    url.searchParams.set("format", "json");
    const response = await fetch(url, {
        signal: AbortSignal.timeout(4000),
        next: { revalidate: 86_400 },
    });
    if (!response.ok) throw new Error(`Geocoder ${response.status}`);
    const { results = [] } = (await response.json()) as {
        results?: GeocodeResult[];
    };
    return results
        .filter((r) => r.timezone && isTimeZone(r.timezone))
        .map((r) => ({
            label: [r.name, regionOf(r), r.country].filter(Boolean).join(", "),
            latitude: r.latitude,
            longitude: r.longitude,
            timeZone: r.timezone as string,
        }));
}
