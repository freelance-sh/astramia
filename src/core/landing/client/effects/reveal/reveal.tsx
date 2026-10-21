import type { PropsWithChildren } from "react";
import { cn } from "@/frontend/lib/utils";
import styles from "./reveal.module.css";

interface RevealProps extends PropsWithChildren {
    className?: string;
    /** Kept for callers; the scroll timeline owns the timing now. */
    delay?: number;
}

/** Fades + lifts its children as they enter, in CSS, with no hydration. */
export function Reveal({ children, className }: RevealProps) {
    return <div className={cn(styles.reveal, className)}>{children}</div>;
}
