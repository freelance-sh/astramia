import type { Metadata } from "next";
import type { PropsWithChildren } from "react";
import { Providers } from "@/frontend/providers/providers";

export const metadata: Metadata = {
    title: "Panel · Astramia",
    robots: { index: false, follow: false },
};

/** The team's panel: not linked anywhere, not indexed, behind sign-in. */
export default function PanelLayout({ children }: PropsWithChildren) {
    return (
        <Providers>
            <div className="min-h-svh bg-background text-foreground">
                {children}
            </div>
        </Providers>
    );
}
