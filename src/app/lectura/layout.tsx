import type { PropsWithChildren } from "react";
import { Providers } from "@/frontend/providers/providers";

export default function LecturaLayout({ children }: PropsWithChildren) {
    return <Providers>{children}</Providers>;
}
