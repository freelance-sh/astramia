import type { PropsWithChildren } from "react";
import { Providers } from "@/frontend/providers/providers";

export default function AuthLayout({ children }: PropsWithChildren) {
    return <Providers>{children}</Providers>;
}
