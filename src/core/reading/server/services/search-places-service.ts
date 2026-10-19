import "server-only";
import type { Place } from "@/core/reading/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { searchPlaces } from "../repository/places";

/** Birthplaces matching what they typed, to pick one from the list. */
export async function searchPlacesService(q: string): AsyncAppResult<Place[]> {
    try {
        return ok(await searchPlaces(q));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
