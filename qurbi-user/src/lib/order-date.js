// Base44 timestamps are UTC. Older Base44 records omit the trailing `Z`, so
// JavaScript would otherwise interpret them in the browser's timezone. Normalize
// only that timezone-less storage format to a UTC instant, then let Intl perform
// the Malaysia-time conversion for every display and day grouping.
const ZONE = "Asia/Kuala_Lumpur";
const TIMEZONE_LESS_BASE44_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?$/;

export const parseBase44Timestamp = (value) => {
  if (value instanceof Date) return value;
  const timestamp = String(value || "").trim();
  return new Date(TIMEZONE_LESS_BASE44_TIMESTAMP.test(timestamp) ? `${timestamp}Z` : timestamp);
};

const validDate = (value) => {
  const date = parseBase44Timestamp(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
/** @typedef {{ year: string, month: string, day: string }} DateParts */

/**
 * @param {unknown} value
 * @returns {DateParts | null}
 */
const parts = (value) => {
  const date = validDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date).reduce((out, part) => ({ ...out, [part.type]: part.value }), /** @type {DateParts} */ ({}));
};
/** @param {DateParts} dateParts */
const dateKey = ({ year, month, day }) => `${year}-${month}-${day}`;

export const orderDateKey = (createdDate) => {
  const dateParts = parts(createdDate);
  return dateParts ? dateKey(dateParts) : "date-unavailable";
};
export const orderTimestamp = (createdDate) => validDate(createdDate)?.getTime() || 0;
export const formatOrderDate = (createdDate, options = {}) => {
  const date = validDate(createdDate);
  return date ? new Intl.DateTimeFormat("en-MY", { timeZone: ZONE, day: "numeric", month: "short", year: "numeric", ...options }).format(date) : "Date unavailable";
};
export const formatOrderTime = (createdDate) => {
  const date = validDate(createdDate);
  return date ? new Intl.DateTimeFormat("en-MY", { timeZone: ZONE, hour: "numeric", minute: "2-digit", hour12: true }).format(date) : "Time unavailable";
};
export const formatOrderDateTime = (createdDate) => {
  const date = validDate(createdDate);
  return date ? new Intl.DateTimeFormat("en-MY", { timeZone: ZONE, day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(date) : "Date unavailable";
};
export const orderDayHeading = (createdDate) => {
  const key = orderDateKey(createdDate);
  if (key === "date-unavailable") return "Date unavailable";
  const todayParts = parts(new Date());
  const today = dateKey(todayParts);
  const yesterdayDate = new Date(Date.UTC(Number(todayParts.year), Number(todayParts.month) - 1, Number(todayParts.day) - 1));
  const yesterday = `${yesterdayDate.getUTCFullYear()}-${String(yesterdayDate.getUTCMonth() + 1).padStart(2, "0")}-${String(yesterdayDate.getUTCDate()).padStart(2, "0")}`;
  if (key === today) return "Today"; if (key === yesterday) return "Yesterday";
  return formatOrderDate(createdDate, { month: "long" });
};
