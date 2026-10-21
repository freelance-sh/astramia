import { cn } from "@/frontend/lib/utils";
import styles from "./nebula.module.css";

/** Slow-drifting aurora blobs + film grain. Pure CSS, server-renderable. */
export function Nebula({ className }: { className?: string }) {
    return (
        <div aria-hidden className={cn(styles.root, "ph-no-capture", className)}>
            <div className={cn(styles.blob, styles.violet)} />
            <div className={cn(styles.blob, styles.rose)} />
            <div className={cn(styles.blob, styles.indigo)} />
            <div className={styles.grain} />
            <div className={styles.vignette} />
        </div>
    );
}
