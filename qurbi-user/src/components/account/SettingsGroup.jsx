import React from "react";
import { ChevronRight } from "lucide-react";

/**
 * A titled group of settings rows (one dark card, rows separated by lines).
 * @param {{ title: string, children: React.ReactNode, className?: string, style?: React.CSSProperties }} props
 */
export function SettingsGroup({ title, children, className = "", style }) {
  return (
    <section className={className} style={style} aria-label={title}>
      <h2 className="mb-2 px-1 text-sm font-bold text-[#41362D]/80">{title}</h2>
      <div className="aisyah-card divide-y divide-white/15 overflow-hidden rounded-2xl">
        {children}
      </div>
    </section>
  );
}

/**
 * One tappable settings row (min 64px tall) with icon, title, subtitle and chevron.
 * @param {{ icon: React.ComponentType<any>, title: string, subtitle?: string, onClick: () => void }} props
 */
export function SettingsRow({ icon: Icon, title, subtitle = "", onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 focus-visible:bg-white/10 focus-visible:outline-none"
    >
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2]">
        <Icon className="h-5 w-5 text-[#41362D]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-white">{title}</span>
        {subtitle && (
          <span className="block break-words text-[13px] text-white/75">{subtitle}</span>
        )}
      </span>
      <ChevronRight className="h-5 w-5 flex-none text-white/80" aria-hidden="true" />
    </button>
  );
}
