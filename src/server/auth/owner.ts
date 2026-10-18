import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { account } from "@/server/drizzle/schemas/auth-schema";

/**
 * The business owner tests paid readings without paying: Mercado Pago won't
 * take the seller's own money. So does his partner, who runs the ads and
 * checks their events (Purchase) end to end.
 */
const OWNER_EMAILS = [
    "hectorzerrillo85@gmail.com",
    "sfrancobaanante@gmail.com",
    "santiago@workin2.com",
];

interface SessionUser {
    email: string;
    emailVerified: boolean;
    isAnonymous?: boolean | null;
}

/**
 * Having the address isn't enough: anyone can type it into a password
 * sign-up, unverified. It has to be verified and signed in through Google
 * (Google vouches for it), with no password on the account that someone
 * could have set before the owner's first sign-in.
 */
export function ownerOf(
    user: SessionUser,
    providerIds: readonly string[],
): boolean {
    return (
        !user.isAnonymous &&
        user.emailVerified &&
        OWNER_EMAILS.includes(user.email.trim().toLowerCase()) &&
        providerIds.includes("google") &&
        !providerIds.includes("credential")
    );
}

export async function isOwner(
    user: SessionUser & { id: string },
): Promise<boolean> {
    if (!ownerOf(user, ["google"])) return false;
    const accounts = await db
        .select({ providerId: account.providerId })
        .from(account)
        .where(eq(account.userId, user.id));
    return ownerOf(
        user,
        accounts.map((a) => a.providerId),
    );
}
