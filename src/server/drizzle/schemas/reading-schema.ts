import {
    doublePrecision,
    index,
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const readingTopic = pgEnum("reading_topic", [
    "amor",
    "compatibilidad",
    "personalidad",
    "camino",
]);
export const chatRole = pgEnum("chat_role", ["user", "assistant"]);

/**
 * A reading starts locked with only its teaser; the full text is written
 * once, after payment. `content` never leaves the server while locked.
 */
export const readings = pgTable(
    "readings",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        topic: readingTopic("topic").notNull(),
        /** YYYY-MM-DD */
        birthDate: text("birth_date").notNull(),
        /** HH:mm, when the visitor knows it. */
        birthTime: text("birth_time"),
        /** IANA zone `birthTime` is read in (the browser's); null → America/Lima. */
        birthTimeZone: text("birth_time_zone"),
        birthPlace: text("birth_place"),
        /** The birthplace picked from the list (the Ascendant needs it). */
        birthLatitude: doublePrecision("birth_latitude"),
        birthLongitude: doublePrecision("birth_longitude"),
        /** The other person, in a compatibility reading. */
        partner: jsonb("partner").$type<{
            birthDate: string;
            birthTime: string | null;
        }>(),
        sunSign: text("sun_sign").notNull(),
        answers: jsonb("answers")
            .$type<
                (
                    | { questionId: string; optionId: string }
                    | { questionId: string; ranking: string[] }
                )[]
            >()
            .notNull(),
        /** The free scenes (Venus, Mars) as JSON; older readings, a paragraph. */
        teaser: text("teaser").notNull(),
        content: text("content"),
        /**
         * When the full reading started being written: a soft lock while
         * `content` is null, then the day its sky (Venus ahead) refers to.
         */
        generatingAt: timestamp("generating_at"),
        unlockedAt: timestamp("unlocked_at"),
        chatExpiresAt: timestamp("chat_expires_at"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [index("readings_user_id_idx").on(table.userId)],
);

export const chatMessages = pgTable(
    "chat_messages",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        readingId: text("reading_id")
            .notNull()
            .references(() => readings.id, { onDelete: "cascade" }),
        role: chatRole("role").notNull(),
        content: text("content").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [index("chat_messages_reading_id_idx").on(table.readingId)],
);

export type ReadingRow = typeof readings.$inferSelect;
export type NewReadingRow = typeof readings.$inferInsert;
export type ChatMessageRow = typeof chatMessages.$inferSelect;
