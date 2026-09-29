import React from "react";
import { cn } from "@/lib/utils";

// QURBI wordmark + leaf mark.
/**
 * @param {{ className?: string, compact?: boolean, light?: boolean }} props
 */
export default function BrandLogo({ className, compact = false, light = false }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground shadow-sm">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6" />
        </svg>
      </div>
      {!compact && (
        <div className="leading-none">
          <p className={cn("font-extrabold tracking-tight text-lg", light ? "text-white" : "text-foreground")}>QURBI</p>
          <p className={cn("text-xs font-semibold uppercase tracking-[0.2em]", light ? "text-white/70" : "text-primary")}>Farmer</p>
        </div>
      )}
    </div>
  );
}