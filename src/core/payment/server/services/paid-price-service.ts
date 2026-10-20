import "server-only";
import type { Price } from "@/core/payment/domain/types";
import { findPaidPrice } from "../repository/orders";

/**
 * What the buyer actually paid for `referenceId`, or `null` when no order is
 * paid for it (never bought: the owner's free unlock). Meta's Purchase is
 * only sent with a price, so this is what tells "paid" from "unlocked".
 * Never fails the page it decorates: no price just means no Purchase.
 */
export async function paidPriceService(
    userId: string,
    referenceId: string,
): Promise<Price | null> {
    try {
        return await findPaidPrice(userId, referenceId);
    } catch {
        return null;
    }
}
