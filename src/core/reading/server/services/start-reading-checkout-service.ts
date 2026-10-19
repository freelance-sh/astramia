import "server-only";
import { getLogger } from "@logtape/logtape";
import { after } from "next/server";
import type { CheckoutResponse } from "@/core/payment/domain/types";
import { createCheckoutService } from "@/core/payment/server/services/create-checkout-service";
import { planFor } from "@/core/reading/domain/plans";
import { CHAT_LIMITS } from "@/core/reading/domain/schemas";
import { CONTINUE_ANCHOR } from "@/core/reading/domain/story";
import { isOwner } from "@/server/auth/owner";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findReading } from "../repository/readings";
import { prepareReadingContentService } from "./ensure-reading-content-service";
import { unlockReadingService } from "./unlock-reading-service";

const logger = getLogger(["server", "reading"]);

/** Opens the checkout that unlocks one of the caller's own locked readings. */
export async function startReadingCheckoutService(
    user: {
        id: string;
        email: string;
        emailVerified: boolean;
        isAnonymous?: boolean | null;
    },
    readingId: string,
    origin: string,
): AsyncAppResult<CheckoutResponse> {
    try {
        const row = await findReading(user.id, readingId);
        if (!row) return err(AppErrors.notFound({ targets: ["reading"] }));
        if (row.unlockedAt)
            return err(AppErrors.conflict({ targets: ["reading"] }));

        // The owner skips the gateway: unlocked here, back on the reading.
        if (await isOwner(user)) {
            await unlockReadingService(user.id, row.id);
            logger.info("Owner unlocked reading {id} without paying", {
                id: row.id,
            });
            return ok({
                checkoutUrl: new URL(
                    `/lectura/r/${row.id}#${CONTINUE_ANCHOR}`,
                    origin,
                ).toString(),
            });
        }

        const checkout = await createCheckoutService({
            userId: user.id,
            productId: "reading_unlock",
            referenceId: row.id,
            returnPath: `/lectura/r/${row.id}`,
            origin,
            // Anonymous accounts carry a placeholder address; let the gateway ask.
            payerEmail: user.isAnonymous ? undefined : user.email,
            title: `Lectura ${planFor(row.topic).of} + ${CHAT_LIMITS.hours} horas de chat`,
        });
        // Start writing while they pay: the checkout hides the model's ~30 s.
        if (checkout.ok)
            after(() => prepareReadingContentService(user.id, row.id));
        return checkout;
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
