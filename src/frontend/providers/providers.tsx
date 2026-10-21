"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { PropsWithChildren } from "react";
import { authClient } from "@/frontend/auth/auth";
import { AuthProvider } from "@/frontend/components/auth/auth-provider";
import { Toaster } from "@/frontend/components/ui/sonner";
import { apiClient, EdenProvider } from "@/frontend/lib/eden";
import { getQueryClient } from "@/frontend/lib/query-client";

/**
 * Data and session providers, only for the pages that use them. The landing
 * and the legal pages stay outside: they only need the root theme, and the
 * auth/query stack is the heaviest run of JS on a phone.
 */
export function Providers({ children }: PropsWithChildren) {
    const queryClient = getQueryClient();
    const router = useRouter();

    return (
        <NuqsAdapter>
            <QueryClientProvider client={queryClient}>
                <EdenProvider client={apiClient} queryClient={queryClient}>
                    <AuthProvider
                        authClient={authClient}
                        redirectTo="/projects"
                        emailAndPassword={{
                            enabled: true,
                            forgotPassword: true,
                        }}
                        navigate={({ to, replace }) =>
                            replace ? router.replace(to) : router.push(to)
                        }
                        Link={Link}
                    >
                        {children}
                        <Toaster />
                    </AuthProvider>
                </EdenProvider>
            </QueryClientProvider>
        </NuqsAdapter>
    );
}
