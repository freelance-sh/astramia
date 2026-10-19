import { Elysia } from "elysia";
import { z } from "zod";
import { placeSchema, placeSearchSchema } from "@/core/reading/domain/schemas";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { searchPlacesService } from "../../services/search-places-service";

/** Open to everyone: the quiz asks for the birthplace before any session. */
export const searchPlacesRoute = new Elysia().get(
    "/places",
    async ({ query, status }) => {
        const result = await searchPlacesService(query.q);
        if (!result.ok)
            return status(
                result.error.status as 500,
                errorToResponse(result.error),
            );
        return status(
            200,
            CommonResponse.successful({ response: result.data }),
        );
    },
    {
        query: placeSearchSchema,
        response: {
            200: successResponseSchema(z.array(placeSchema), "Places"),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Readings"],
            summary: "Search birthplaces by name (city, region, country, zone)",
        },
    },
);
