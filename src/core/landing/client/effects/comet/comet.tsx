import { cn } from "@/frontend/lib/utils";
import styles from "./comet.module.css";

/**
 * A slow comet that crosses the whole page every half minute or so.
 * Pure CSS, fixed and non-interactive, server-renderable.
 */
export function Comet({ className }: { className?: string }) {
    return (
        <div aria-hidden className={cn(styles.root, "ph-no-capture", className)}>
            <div className={styles.comet}>
                <span className={styles.tail} />
                <span className={styles.head} />
            </div>
        </div>
    );
}
