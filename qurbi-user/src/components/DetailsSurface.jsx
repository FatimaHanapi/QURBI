import React from "react";

/**
 * Dark sheet that slides over the detail hero. `withActionBar` reserves room
 * for the sticky action bar + bottom nav so the last card is never covered.
 */
export function DetailOuterSheet({ raised = false, withActionBar = false, children, className = "" }) {
  return (
    <main
      className={`relative z-10 mx-auto -mt-12 max-w-5xl space-y-4 rounded-t-[32px] bg-gradient-to-br from-[#41362D] to-[#6B594A] px-4 pt-5 text-white shadow-xl shadow-black/20 transition-all duration-300 ease-out sm:px-6 ${withActionBar ? "qurbi-action-bar-space" : "pb-[calc(7rem+env(safe-area-inset-bottom))]"} ${raised ? "-translate-y-12" : "translate-y-0"} ${className}`}
    >
      {children}
    </main>
  );
}

export function LightDetailCard({ title, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] p-5 text-black shadow-sm ${className}`}
    >
      {title && (
        <h2 className="mb-4 text-lg font-extrabold text-black">{title}</h2>
      )}
      {children}
    </section>
  );
}

export function DarkInfoTile({ label, value, className = "" }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div
      className={`min-w-0 rounded-xl bg-gradient-to-br from-[#41362D] to-[#6B594A] p-3.5 text-white ${className}`}
    >
      <p className="text-sm font-semibold text-white/70">{label}</p>
      <p className="mt-1 break-words text-base font-extrabold text-white">
        {value}
      </p>
    </div>
  );
}
