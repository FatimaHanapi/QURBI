import React from "react";
import { ChevronRight, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

function initials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
}

/**
 * Compact, scannable account row used by the admin Farmers and Buyers lists.
 * @param {{ name?: string, email?: string, subtitle?: React.ReactNode, badge?: React.ReactNode, meta?: { icon?: React.ElementType, label: string, value: React.ReactNode }[], onClick?: () => void, accent?: string, ctaLabel?: string, attention?: boolean }} props
 */
export default function AdminAccountCard({
  name,
  email,
  subtitle,
  badge,
  meta = [],
  onClick,
  accent = "primary",
  ctaLabel = "View account",
  attention = false,
}) {
  const Component = onClick ? "button" : "article";
  const accentClass = accent === "buyer"
    ? "bg-sky-100 text-sky-800"
    : attention ? "bg-amber-100 text-amber-800" : "bg-secondary text-primary";

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "soft-card group w-full min-w-0 overflow-hidden p-0 text-left",
        attention && "border-amber-300/80",
        onClick && "transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold", accentClass)} aria-hidden="true">
          {initials(name)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="min-w-0 max-w-full truncate text-[15px] font-extrabold text-foreground sm:text-base">{name}</h2>
            {badge}
          </div>
          {subtitle && <p className="mt-0.5 truncate text-sm font-medium text-foreground/75">{subtitle}</p>}
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{email || "Email unavailable"}</span>
          </p>
          {meta.length > 0 && (
            <dl className="mt-2 flex min-w-0 flex-wrap gap-x-4 gap-y-1">
              {meta.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex min-w-0 items-center gap-1.5 text-sm">
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden="true" />}
                  <dt className="sr-only">{label}</dt>
                  <dd className="truncate font-semibold text-foreground/85">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        {onClick && !attention && <ChevronRight className="mt-3 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />}
      </div>

      {onClick && attention && (
        <div className="flex min-h-11 items-center justify-between border-t border-amber-200 bg-amber-50/80 px-4 py-2.5 text-sm font-extrabold text-amber-900">
          <span>{ctaLabel}</span>
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
      )}
    </Component>
  );
}
