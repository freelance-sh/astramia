import "server-only";
import { getLogger } from "@logtape/logtape";
import { captureServerEvent } from "@/core/analytics/server/posthog";
import { orderStatusFor, samePrice } from "@/core/payment/domain/catalog";
import type { Order, PaymentProvider } from "@/core/payment/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { getPaymentGateway } from "../repository/gateways";
import {
    findOrderById,
    recordPaymentEvent,
    transitionOrder,
} from "../repository/orders";
import { toOrder } from "../repository/utils";
import { fulfillOrder } from "./fulfill-order";

const logger = getLogger(["server", "payment"]);

/**
 * Re-reads a payment from its gateway and applies it to our order. Safe to
 * call any number of times (webhook retries, the browser return, a manual
 * re-sync): the order transition is conditional and fulfillment idempotent.
 */
export async function syncPaymentService(
    provider: PaymentProvider,
    providerPaymentId: string,
): AsyncAppResult<{ order: Order | null }> {
    try {
        const payment =
            await getPaymentGateway(provider).fetchPayment(providerPaymentId);
        const order = payment.orderId
            ? await findOrderById(payment.orderId)
            : null;

        await recordPaymentEvent({
            eventKey: `${provider}:${payment.providerPaymentId}:${payment.status}`,
            provider,
            providerPaymentId: payment.providerPaymentId,
            orderId: order?.id ?? null,
            status: payment.status,
            amountCents: payment.price.amountCents,
            currency: payment.price.currency,
        });

        if (!order || order.provider !== provider) {
            logger.warn("Payment {id} from {provider} matches no order", {
                id: payment.providerPaymentId,
                provider,
            });
            return ok({ order: null });
        }

        const orderPrice = {
            amountCents: order.amountCents,
            currency: order.currency,
        };
        if (
            payment.status === "approved" &&
            !samePrice(payment.price, orderPrice)
        ) {
            logger.error(
                "Payment {id} amount {paid} does not match order {order}",
                {
                    id: payment.providerPaymentId,
                    paid: payment.price,
                    order: order.id,
                },
            );
            return err(AppErrors.conflict({ targets: ["amount"] }));
        }

        const status = orderStatusFor(payment.status);
        // A paid order only moves on to refunded; a late "pending" never downgrades it.
        const keep = order.status === "paid" && status !== "refunded";
        const changed = keep
            ? null
            : await transitionOrder(order.id, {
                  status,
                  providerPaymentId: payment.providerPaymentId,
                  payerEmail: payment.payerEmail,
                  paidAt: status === "paid" ? new Date() : undefined,
              });
        const current = toOrder(changed ?? order);
        // Fulfillments are idempotent, so a retry repairs one that failed midway.
        if (current.status === "paid") await fulfillOrder(current);

        // The money event, once per order: the webhook and the browser's
        // return both land here, but only the transition to paid counts.
        if (changed && current.status === "paid")
            await captureServerEvent("purchase", current.userId, {
                reading_id: current.referenceId,
                revenue: current.price.amountCents,
                currency: current.price.currency,
                provider,
            });

        return ok({ order: current });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
