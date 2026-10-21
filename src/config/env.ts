import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import { DEFAULT_AI_MODELS } from "@/core/ai/domain/models";

export const env = createEnv({
    server: {
        // Optional while only the landing + legal pages are deployed.
        // TODO: make required again once auth/DB features ship.
        DATABASE_URL: z.url().optional(),
        BETTER_AUTH_SECRET: z.string().min(32).optional(),
        /** Which gateway new checkouts go through. Webhooks of every gateway keep working. */
        PAYMENT_PROVIDER: z.enum(["mercadopago"]).default("mercadopago"),
        MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
        /** "Clave secreta" of the webhook in Mercado Pago → Tus integraciones → Webhooks. */
        MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),
        /** Meta Conversions API: the purchase Meta never sees if the tab closes. */
        META_CAPI_TOKEN: z.string().optional(),
        /** The name some Meta guides use; either works. */
        META_CAPI_ACCESS_TOKEN: z.string().optional(),
        /** Events Manager → Test Events code; send test purchases there. */
        META_TEST_EVENT_CODE: z.string().optional(),
        META_GRAPH_VERSION: z.string().default("v23.0"),
        /** Vercel AI Gateway. On Vercel deployments OIDC replaces it. */
        AI_GATEWAY_API_KEY: z.string().optional(),
        /** "Continuar con Google" shows up once both are set (Google Cloud → OAuth client). */
        GOOGLE_CLIENT_ID: z.string().optional(),
        GOOGLE_CLIENT_SECRET: z.string().optional(),
        /** Resend: sign-in codes by e-mail. Without it, accounts use a password. */
        RESEND_API_KEY: z.string().optional(),
        /** Sender on a domain verified in Resend. */
        EMAIL_FROM: z.string().default("Astramia <hola@astramia.app>"),
        AI_MODEL_TEASER: z.string().default(DEFAULT_AI_MODELS.teaser),
        AI_MODEL_READING: z.string().default(DEFAULT_AI_MODELS.reading),
        AI_MODEL_CHAT: z.string().default(DEFAULT_AI_MODELS.chat),
        AI_MODEL_REVIEW: z.string().default(DEFAULT_AI_MODELS.review),
        /** Served by the Gateway when a call's own model fails. */
        AI_MODEL_FALLBACK: z.string().default(DEFAULT_AI_MODELS.fallback),
        /** Set by Vercel: which kind of deployment this is. */
        VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
    },
    client: {
        NEXT_PUBLIC_APP_URL: z.url(),
        /** PostHog project token; analytics stays off while it's empty. */
        NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: z.string().optional(),
        NEXT_PUBLIC_POSTHOG_HOST: z.url().default("https://us.i.posthog.com"),
    },
    runtimeEnv: {
        DATABASE_URL: process.env.DATABASE_URL,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
        PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
        MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN,
        MERCADOPAGO_WEBHOOK_SECRET: process.env.MERCADOPAGO_WEBHOOK_SECRET,
        META_CAPI_TOKEN: process.env.META_CAPI_TOKEN,
        META_CAPI_ACCESS_TOKEN: process.env.META_CAPI_ACCESS_TOKEN,
        META_TEST_EVENT_CODE: process.env.META_TEST_EVENT_CODE,
        META_GRAPH_VERSION: process.env.META_GRAPH_VERSION,
        AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        EMAIL_FROM: process.env.EMAIL_FROM,
        AI_MODEL_TEASER: process.env.AI_MODEL_TEASER,
        AI_MODEL_READING: process.env.AI_MODEL_READING,
        AI_MODEL_CHAT: process.env.AI_MODEL_CHAT,
        AI_MODEL_REVIEW: process.env.AI_MODEL_REVIEW,
        AI_MODEL_FALLBACK: process.env.AI_MODEL_FALLBACK,
        VERCEL_ENV: process.env.VERCEL_ENV,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN:
            process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
        NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    },
    emptyStringAsUndefined: true,
});
