import React from "react";
import { useTranslation } from "react-i18next";
import { TONE_CLASSES, orderStatusInfo } from "@/components/account/orderStatus";

/**
 * Order status chip. Pass an order (label + tone come from the shared mapping)
 * or an explicit `label` + `tone`.
 * @param {{ order?: any, label?: string, tone?: keyof typeof TONE_CLASSES, size?: "sm" | "md", className?: string }} props
 */
export default function StatusChip({ order = null, label = "", tone = "info", size = "sm", className = "" }) {
  const { t } = useTranslation("account");
  const status = order ? orderStatusInfo(order) : null;
  const text = status ? t(status.labelKey) : label;
  const chipTone = status ? status.tone : tone;
  return (
    <span
      className={`inline-flex max-w-full items-center whitespace-nowrap rounded-full border font-bold ${size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs"} ${TONE_CLASSES[chipTone] || TONE_CLASSES.info} ${className}`}
    >
      {text}
    </span>
  );
}
