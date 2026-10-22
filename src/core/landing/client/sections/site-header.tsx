import Link from "next/link";
import { Button } from "@/frontend/components/ui/button";
import { NAV_LINKS, START_READING_HREF } from "../../domain/content";
import { GoldButton } from "../effects";
import { AstramiaLogo } from "./astramia-logo";

export function SiteHeader() {
    return (
        <header className="sticky top-0 z-50 border-astral-ink border-b bg-background/40 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                <Link href="/" aria-label="Astramia, inicio">
                    <AstramiaLogo />
                </Link>
                <nav
                    aria-label="Principal"
                    className="hidden items-center gap-1 md:flex"
                >
                    {NAV_LINKS.map((link) => (
                        <Button
                            key={link.href}
                            variant="ghost"
                            size="sm"
                            asChild
                        >
                            <a
                                href={link.href}
                                className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.16em] hover:text-foreground"
                            >
                                {link.label}
                            </a>
                        </Button>
                    ))}
                </nav>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.16em] hover:text-foreground"
                    >
                        <Link href="/lecturas">Mis lecturas</Link>
                    </Button>
                    <GoldButton size="sm" asChild className="rounded-full px-4">
                        <Link
                            href={START_READING_HREF}
                            data-track="cta_header"
                        >
                            Empezar
                        </Link>
                    </GoldButton>
                </div>
            </div>
        </header>
    );
}
