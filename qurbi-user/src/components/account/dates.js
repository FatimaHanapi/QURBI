import { orderDateKey, orderDayHeading, formatOrderDate, formatOrderTime } from "@/lib/order-date";

/**
 * Translated day heading ("Today" / "Yesterday" / "30 September 2026").
 * @param {unknown} value
 * @param {(key: string) => string} t translator bound to the "account" namespace
 */
export function dayHeading(value, t) {
  const key = orderDateKey(value);
  if (key === "date-unavailable") return t("dates.unavailable");
  const heading = orderDayHeading(value);
  if (heading === "Today") return t("dates.today");
  if (heading === "Yesterday") return t("dates.yesterday");
  return heading;
}

/**
 * "30 Sep 2026, 1:39 am" or a translated fallback.
 * @param {unknown} value
 * @param {(key: string) => string} t
 */
export function shortDateTime(value, t) {
  if (orderDateKey(value) === "date-unavailable") return t("dates.unavailable");
  return `${formatOrderDate(value)}, ${formatOrderTime(value)}`;
}

/** @param {unknown} value @param {(key: string) => string} t */
export function timeOnly(value, t) {
  if (orderDateKey(value) === "date-unavailable") return t("dates.unavailable");
  return formatOrderTime(value);
}
