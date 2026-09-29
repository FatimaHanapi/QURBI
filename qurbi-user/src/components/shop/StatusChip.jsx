import React from "react";
import { useTranslation } from "react-i18next";
import { isOpenForSale, statusKey, statusLabel } from "@/lib/listing-display";

// Hex utilities on purpose: index.css remaps named palette classes
// (bg-red-*, text-green-* ...) to the taupe theme.
const STYLES = {
  positive: "border-[#15803D]/30 bg-[#DCFCE7] text-[#14532D]",
  waiting: "border-[#B45309]/30 bg-[#FEF3C7] text-[#78350F]",
  negative: "border-[#B91C1C]/30 bg-[#FEE2E2] text-[#7F1D1D]",
};

/** One human status label + colour for listings (available/open/reserved/sold...). */
export default function StatusChip({ status, className = "" }) {
  const { t } = useTranslation("shopflow");
  const label = statusLabel(t, status) || t("labels.status.unavailable");
  const key = statusKey(status);
  const tone = isOpenForSale(status) ? "positive" : key === "reserved" || key === "pending" ? "waiting" : "negative";
  return (
    <span
      className={`inline-flex min-h-7 flex-none items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${STYLES[tone]} ${className}`}
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
      {label}
    </span>
  );
}
