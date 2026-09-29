// Prices arrive from the API as decimal strings ("8500.00"), so
// `value.toLocaleString()` on them is a no-op. Always format through here.
const RM = new Intl.NumberFormat("en-MY", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Formats an amount as Malaysian ringgit, e.g. 8500 -> "RM 8,500",
 * "1234.5" -> "RM 1,234.50". Sen are only shown when non-zero.
 * @param {number | string | null | undefined} value
 * @returns {string}
 */
export function formatRM(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "RM 0";
  const hasSen = Math.round(amount * 100) % 100 !== 0;
  const text = hasSen
    ? amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : RM.format(amount);
  return `RM ${text}`;
}
