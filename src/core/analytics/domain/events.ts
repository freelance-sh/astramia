import { z } from "zod";

/**
 * Events the site records. Not a closed list: any short snake_case name is
 * stored, so a new question needs no migration. These are the ones the
 * panel reads.
 *
 * In the browser: page_view, page_leave (active seconds), click (any
 * `data-track` element), start_reading_click (the CTA that opened the quiz),
 * client_error, quiz_start, quiz_answer, quiz_back, quiz_abandon (closed
 * before submitting), quiz_submit, quiz_error, reading_view, story_step (each
 * new step reached, with the seconds the previous one held them),
 * paywall_view (with the price), paywall_button_view (the unlock button
 * reached the screen), paywall_exit (the tab left after the price, before
 * paying), story_end, checkout_click, chat_view, chat_send.
 *
 * On the server: reading_created (ms to write the free part), content_written
 * (ms for the paid one), checkout_return, payment_approved, chat_reply.
 */
export const eventNameSchema = z.string().regex(/^[a-z][a-z0-9_]{1,39}$/);

const propValueSchema = z.union([
    z.string().max(500),
    z.number(),
    z.boolean(),
    z.null(),
]);

export const eventPropsSchema = z
    .record(z.string().max(40), propValueSchema)
    .refine((props) => Object.keys(props).length <= 20, "Too many props");

/** What the browser sends, a few seconds' worth at a time. */
export const trackBatchSchema = z.object({
    visitorId: z.string().min(8).max(64),
    sessionId: z.string().min(8).max(64),
    events: z
        .array(
            z.object({
                name: eventNameSchema,
                /** How long ago it happened: the server's clock dates it. */
                ago: z
                    .number()
                    .int()
                    .min(0)
                    .max(60 * 60 * 1000),
                path: z.string().max(200).optional(),
                readingId: z.string().max(64).optional(),
                props: eventPropsSchema.optional(),
            }),
        )
        .min(1)
        .max(50),
});

export type TrackBatch = z.infer<typeof trackBatchSchema>;

/** Crawlers and link previews: their visits aren't people's. */
export const BOT_AGENT =
    /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|pingdom|curl|wget|python-requests/i;
