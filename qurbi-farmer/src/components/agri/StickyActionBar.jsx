import React from "react";
import { cn } from "@/lib/utils";

/**
 * Action bar that stays visible at the bottom of the screen while the page
 * scrolls. On phones it floats just above the farmer bottom navigation; on
 * desktop (no bottom nav) it sits at the bottom edge. Put it as the last child
 * of a page so it rests in place when the page is scrolled to the end.
 * Use `standalone` on screens without the bottom navigation (e.g. verification).
 * @param {{ children?: React.ReactNode, hint?: React.ReactNode, hintTone?: "muted" | "danger" | "success", className?: string, standalone?: boolean }} props
 */
export default function StickyActionBar({ children, hint, hintTone = "muted", className, standalone = false }) {
  return (
    <div
      className={cn(
        "sticky z-30 mt-6",
        standalone
          ? "bottom-[max(0.75rem,env(safe-area-inset-bottom))]"
          : "bottom-[calc(7rem+env(safe-area-inset-bottom))] lg:bottom-4",
        className
      )}
    >
      <div className="rounded-[1.4rem] border border-border/80 bg-card/95 p-3 shadow-[0_10px_30px_rgba(65,54,45,0.16)] backdrop-blur-xl">
        {hint && (
          <p
            role="status"
            className={cn(
              "mb-2.5 px-1 text-sm font-medium leading-snug",
              hintTone === "danger" ? "text-destructive" : hintTone === "success" ? "text-emerald-700" : "text-muted-foreground"
            )}
          >
            {hint}
          </p>
        )}
        <div className="flex gap-3">{children}</div>
      </div>
    </div>
  );
}
