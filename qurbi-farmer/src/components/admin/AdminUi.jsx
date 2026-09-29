import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One clear page title with an optional eyebrow, description, back button and actions.
 * @param {{ eyebrow?: React.ReactNode, title: React.ReactNode, description?: React.ReactNode, actions?: React.ReactNode, backTo?: string | number, backLabel?: string, className?: string }} props
 */
export function AdminPageHeader({ eyebrow, title, description, actions, backTo, backLabel = "Go back", className }) {
  const navigate = useNavigate();
  return (
    <header className={cn("flex items-start gap-3", className)}>
      {backTo !== undefined && (
        <button
          type="button"
          onClick={() => (typeof backTo === "number" ? navigate(backTo) : navigate(backTo))}
          aria-label={backLabel}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-card text-primary shadow-[0_2px_8px_rgba(65,54,45,0.07)] ring-1 ring-border/70 transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary/80">{eyebrow}</p>}
        <h1 className={cn("text-2xl font-extrabold tracking-tight text-foreground lg:text-3xl", eyebrow && "mt-0.5")}>{title}</h1>
        {description && <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/**
 * Wrapping filter chips (never overflow horizontally) with optional counts.
 * @param {{ options: { value: string, label: React.ReactNode, count?: number, attention?: boolean }[], value: string, onChange: (value: string) => void, label?: string, className?: string }} props
 */
export function FilterChips({ options, value, onChange, label = "Filter", className }) {
  return (
    <div role="group" aria-label={label} className={cn("flex min-w-0 flex-wrap gap-2", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-full px-3.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "brand-gradient text-primary-foreground shadow-sm" : "bg-card text-foreground/80 ring-1 ring-border hover:bg-secondary/45",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cn(
                "flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-extrabold",
                active ? "bg-white/20 text-white" : option.attention && option.count > 0 ? "bg-amber-100 text-amber-800" : "bg-muted text-foreground",
              )}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * @param {{ id: string, label: string, value: string, onChange: (value: string) => void, placeholder?: string, disabled?: boolean, className?: string }} props
 */
export function SearchField({ id, label, value, onChange, placeholder, disabled, className }) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="h-12 w-full rounded-2xl border border-input bg-card pl-10 pr-11 text-base text-foreground shadow-[0_2px_8px_rgba(65,54,45,0.04)] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 md:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Sticky bottom action bar. Place it as the LAST child of the page: it pins above the
 * mobile admin bottom nav (and to the viewport bottom on desktop) while the page scrolls.
 * @param {{ children: React.ReactNode, className?: string, label?: string }} props
 */
export function StickyActionBar({ children, className, label = "Actions" }) {
  return (
    <div
      role="region"
      aria-label={label}
      className={cn(
        "sticky bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-30 mt-6 rounded-[1.5rem] border border-border/80 bg-card/95 p-3 shadow-[0_12px_32px_rgba(65,54,45,0.18)] backdrop-blur-xl lg:bottom-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Label/value pair for detail cards.
 * @param {{ icon?: React.ElementType, label: React.ReactNode, value?: React.ReactNode, mono?: boolean, className?: string }} props
 */
export function InfoItem({ icon: Icon, label, value, mono, className }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-primary/70" />}
        {label}
      </p>
      <p className={cn("mt-0.5 break-words text-sm font-bold text-foreground", mono && "tabular-nums tracking-wide")}>{value || "—"}</p>
    </div>
  );
}

/**
 * Small section card with heading.
 * @param {{ title?: React.ReactNode, description?: React.ReactNode, action?: React.ReactNode, children?: React.ReactNode, className?: string, bodyClassName?: string }} props
 */
export function AdminCard({ title, description, action, children, className, bodyClassName }) {
  return (
    <section className={cn("soft-card overflow-hidden", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-base font-extrabold tracking-tight">{title}</h2>}
            {description && <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** @param {{ shown: number, total: number, noun: string }} props */
export function ResultCount({ shown, total, noun }) {
  const plural = (n) => `${noun}${n === 1 ? "" : "s"}`;
  return (
    <p className="text-sm font-semibold text-muted-foreground" aria-live="polite">
      {shown === total ? `${total} ${plural(total)}` : `Showing ${shown} of ${total} ${plural(total)}`}
    </p>
  );
}

/** @param {{ rows?: number }} props */
export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-[1.25rem] bg-muted" />)}
      <span className="sr-only">Loading</span>
    </div>
  );
}
