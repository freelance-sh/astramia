import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import type { PropsWithChildren } from "react";
import { MetaPixel } from "@/core/analytics/client/meta-pixel";
import { PostHogAnalytics } from "@/core/analytics/client/posthog";
import { SiteAnalytics } from "@/core/analytics/client/site-analytics";
import { OFFER } from "@/core/landing/domain/content";
import { Providers } from "@/frontend/providers/providers";
import "./globals.css";

const geistSans = Geist({
    subsets: ["latin"],
    variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
    subsets: ["latin"],
    variable: "--font-geist-mono",
});

const instrumentSerif = Instrument_Serif({
    subsets: ["latin"],
    weight: "400",
    style: ["normal", "italic"],
    variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
    title: "Astramia — Lecturas astrológicas personalizadas",
    description: `Recibe tu lectura astrológica sobre amor y relaciones en minutos y conversa ${OFFER.chatHours} horas con una IA que conoce tu carta. Pago único de ${OFFER.price}.`,
};

export default function RootLayout({ children }: PropsWithChildren) {
    return (
        <html
            lang="es"
            suppressHydrationWarning
            className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
        >
            <body className="min-h-svh antialiased">
                <Providers>{children}</Providers>
                <PostHogAnalytics />
                <SiteAnalytics />
                <MetaPixel />
            </body>
        </html>
    );
}
