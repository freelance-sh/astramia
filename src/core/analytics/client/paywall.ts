/**
 * What the reading's paywall knows while it lasts: whether the unlock button
 * was actually on screen, and whether the checkout was opened. The leave
 * event needs both to tell "closed the tab at the price" from "already tried
 * to pay".
 */

const buttons = new Map<string, number>();
const checkoutKey = (readingId: string) => `astramia:checkout:${readingId}`;

export function markPaywallButtonSeen(readingId: string): void {
    if (!buttons.has(readingId)) buttons.set(readingId, Date.now());
}

export function paywallButtonSeenAt(readingId: string): number | null {
    return buttons.get(readingId) ?? null;
}

export function markCheckout(readingId: string): void {
    try {
        sessionStorage.setItem(checkoutKey(readingId), "1");
    } catch {}
}

export function checkoutStarted(readingId: string): boolean {
    try {
        if (sessionStorage.getItem(checkoutKey(readingId))) return true;
    } catch {}
    return false;
}
