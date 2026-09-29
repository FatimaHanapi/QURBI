import React from "react";
import { cn } from "@/lib/utils";
import { VERIFICATION_STATUSES, bulkStatusMeta, livestockStatusMeta, orderStatusMeta } from "@/lib/agri";

const TONES = {
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-700",
  muted: "bg-muted text-muted-foreground",
  info: "bg-sky-100 text-sky-800",
  primary: "bg-primary/10 text-primary",
};

const DOTS = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  muted: "bg-muted-foreground/50",
  info: "bg-sky-500",
  primary: "bg-primary",
};

/** @param {"livestock" | "order" | "bulk" | "verification"} kind @param {string} status @param {any} [item] */
function metaFor(kind, status, item) {
  if (kind === "order") return orderStatusMeta(status);
  if (kind === "bulk") return bulkStatusMeta(status);
  if (kind === "verification") return VERIFICATION_STATUSES[status] || { label: status || "Unknown", tone: "muted" };
  return livestockStatusMeta(status, item);
}

/**
 * Status chip. Either pass `tone` + children (legacy), or pass `kind` + `status`
 * (optionally `item` for livestock expiry) to use the shared label/tone mapping
 * from lib/agri. Explicit `tone`/children always win.
 * Optional `icon` (a lucide-style component) renders before the label.
 * @param {{ tone?: string, dot?: boolean, children?: React.ReactNode, className?: string, kind?: "livestock" | "order" | "bulk" | "verification", status?: string, item?: any, icon?: React.ElementType }} props
 */
export default function StatusBadge({ tone, dot = false, children, className, kind, status, item, icon: Icon }) {
  const meta = kind ? metaFor(kind, status, item) : null;
  const resolvedTone = tone || meta?.tone || "muted";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        TONES[resolvedTone] || TONES.muted,
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOTS[resolvedTone] || DOTS.muted)} aria-hidden="true" />}
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      {children ?? meta?.label}
    </span>
  );
}
