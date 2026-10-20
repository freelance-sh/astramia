import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import type { Price } from "@/core/payment/domain/types";
import { db } from "@/server/drizzle/db";
import {
    type NewOrderRow,
    type NewPaymentEventRow,
    type OrderRow,
    orders,
    paymentEvents,
} from "@/server/drizzle/schemas/payment-schema";

export async function createOrder(values: NewOrderRow): Promise<OrderRow> {
    const [row] = await db.insert(orders).values(values).returning();
    return row;
}

export async function findOrderById(id: string): Promise<OrderRow | null> {
    const row = await db.query.orders.findFirst({ where: eq(orders.id, id) });
    return row ?? null;
}

/** E-mail the buyer gave the gateway for `referenceId`, if they paid. */
export async function findPayerEmail(
    userId: string,
    referenceId: string,
): Promise<string | null> {
    const row = await db.query.orders.findFirst({
        columns: { payerEmail: true },
        where: and(
            eq(orders.userId, userId),
            eq(orders.referenceId, referenceId),
            eq(orders.status, "paid"),
        ),
        orderBy: [desc(orders.paidAt)],
    });
    return row?.payerEmail ?? null;
}

/**
 * What a paid order for `referenceId` actually charged. Meta gets this, not
 * our catalog: the gateway may have applied a coupon or a local price.
 */
export async function findPaidPrice(
    userId: string,
    referenceId: string,
): Promise<Price | null> {
    const row = await db.query.orders.findFirst({
        columns: { amountCents: true, currency: true },
        where: and(
            eq(orders.userId, userId),
            eq(orders.referenceId, referenceId),
            eq(orders.status, "paid"),
        ),
        orderBy: [desc(orders.paidAt)],
    });
    if (!row) return null;
    return { amountCents: row.amountCents, currency: row.currency };
}

export async function setOrderProviderRef(
    id: string,
    providerRef: string,
): Promise<void> {
    await db.update(orders).set({ providerRef }).where(eq(orders.id, id));
}

/**
 * Moves an order to `status`. Returns the row only when it actually changed,
 * so "just became paid" fires exactly once even if two deliveries race.
 */
export async function transitionOrder(
    id: string,
    values: Pick<OrderRow, "status"> &
        Partial<Pick<OrderRow, "providerPaymentId" | "payerEmail" | "paidAt">>,
): Promise<OrderRow | null> {
    const [row] = await db
        .update(orders)
        .set(values)
        .where(and(eq(orders.id, id), ne(orders.status, values.status)))
        .returning();
    return row ?? null;
}

/** Records a reported payment state. `false` when it was already recorded. */
export async function recordPaymentEvent(
    values: NewPaymentEventRow,
): Promise<boolean> {
    const rows = await db
        .insert(paymentEvents)
        .values(values)
        .onConflictDoNothing({ target: paymentEvents.eventKey })
        .returning({ id: paymentEvents.id });
    return rows.length > 0;
}
