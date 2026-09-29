import React from "react";

/**
 * Fixed action bar that sits just above the bottom navigation (76px + safe
 * area). Pages using it need extra bottom padding: `pb-[calc(11rem+env(safe-area-inset-bottom))]`.
 * @param {{ children: React.ReactNode, aboveNav?: boolean }} props
 */
export default function StickyActionBar({ children, aboveNav = true }) {
  return (
    <div
      className={`fixed inset-x-0 z-40 px-4 pb-2 pt-2 ${aboveNav ? "bottom-[calc(76px+env(safe-area-inset-bottom))]" : "bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"}`}
    >
      <div className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-2xl border border-[#E3C19F] bg-[#FFFDF9]/95 p-2 shadow-[0_-6px_24px_rgba(65,54,45,0.18)] backdrop-blur">
        {children}
      </div>
    </div>
  );
}
