// Shared button looks for the account pages (all >= 44px tall, visible focus).
const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9825F] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

/** Dark brown gradient: the one main action on a screen. */
export const primaryBtn = `${base} bg-gradient-to-br from-[#41362D] to-[#6B594A] text-white shadow-md shadow-black/20`;
/** Cream: primary action placed on a dark card. */
export const lightBtn = `${base} bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] text-[#41362D] shadow-sm`;
/** Outlined, for secondary actions on light backgrounds. */
export const secondaryBtn = `${base} border-2 border-[#6B594A] bg-transparent text-[#41362D]`;
/** Outlined, for secondary actions on dark cards. */
export const ghostOnDarkBtn = `${base} border border-[#E3C19F]/70 bg-transparent text-white`;
/** Quiet destructive (never the most prominent thing on screen). */
export const dangerOutlineBtn = `${base} border-2 border-[#C2410C]/60 bg-transparent text-[#9A2E0C]`;
/** Destructive confirm button inside a confirmation dialog. */
export const dangerBtn = `${base} bg-[#B42318] text-white shadow-sm`;
