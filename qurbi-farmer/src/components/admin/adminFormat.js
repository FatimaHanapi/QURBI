// Formatting + status mapping shared by the admin screens only.
// (Farmer screens use src/lib/agri.js; these helpers stay local to admin.)

const PRICE = new Intl.NumberFormat("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const PRICE_SEN = new Intl.NumberFormat("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DATE = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", year: "numeric" });
const DATE_TIME = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** "RM 8,500" — sen only when non-zero ("RM 8,500.50"). */
export function formatPrice(amount) {
  if (amount === null || amount === undefined || amount === "") return "—";
  const number = Number(amount);
  if (!Number.isFinite(number)) return "—";
  return `RM ${(Number.isInteger(number) ? PRICE : PRICE_SEN).format(number)}`;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "28 Sept 2026" */
export function formatDate(value, fallback = "—") {
  const date = toDate(value);
  return date ? DATE.format(date) : fallback;
}

/** "28 Sept 2026, 1:37 am" */
export function formatDateTime(value, fallback = "—") {
  const date = toDate(value);
  return date ? DATE_TIME.format(date) : fallback;
}

/** Species / breed / category may arrive as a backend object or a plain string. */
export function nameOf(value, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "name" in value) return String(value.name || fallback);
  return fallback;
}

export function titleCase(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function initials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
}

// ---------- farmer verification ----------
export const VERIFICATION = {
  pending: { label: "Pending review", short: "Pending", tone: "warning" },
  verified: { label: "Approved", short: "Approved", tone: "success" },
  approved: { label: "Approved", short: "Approved", tone: "success" },
  rejected: { label: "Rejected", short: "Rejected", tone: "danger" },
  unverified: { label: "Not submitted", short: "Not submitted", tone: "muted" },
};

export function verificationInfo(status) {
  return VERIFICATION[String(status || "unverified").toLowerCase()] || VERIFICATION.unverified;
}

// ---------- livestock ----------
const LIVESTOCK = {
  available: { label: "Available", tone: "success" },
  reserved: { label: "Reserved", tone: "warning" },
  sold: { label: "Sold", tone: "muted" },
  unavailable: { label: "Unavailable", tone: "muted" },
  draft: { label: "Draft", tone: "muted" },
  sick: { label: "Sick", tone: "danger" },
};

export function livestockStatusInfo(status) {
  const key = String(status || "").toLowerCase();
  return LIVESTOCK[key] || { label: status ? titleCase(status) : "Unknown", tone: "muted" };
}

export function genderLabel(value) {
  if (!value) return "Not specified";
  return titleCase(value);
}

export function listingTitle(item) {
  const breed = nameOf(item?.breed);
  return item?.title || [nameOf(item?.species), breed && breed !== "Unspecified" ? breed : ""].filter(Boolean).join(" · ") || "Livestock";
}

// ---------- orders ----------
// Normalised order.status values (see qurbiClient normalizeOrder).
const ORDER = {
  pending: { label: "Awaiting payment", tone: "warning", next: "Buyer has not paid yet — no admin action." },
  paid: { label: "Paid", tone: "info", next: "Farmer to prepare the animal." },
  processing: { label: "Preparing", tone: "info", next: "Farmer is preparing the animal." },
  shipped: { label: "In transit", tone: "primary", next: "On the way to the buyer." },
  delivered: { label: "Delivered", tone: "success", next: "Waiting for the buyer to confirm receipt." },
  completed: { label: "Completed", tone: "success", next: "Buyer confirmed receipt. Nothing to do." },
  cancelled: { label: "Cancelled", tone: "danger", next: "Order was cancelled." },
  refunded: { label: "Refunded", tone: "muted", next: "Refund approved." },
  refund_requested: { label: "Refund requested", tone: "danger", next: "Review the refund request.", action: true },
};

export function isPendingRefund(order) {
  return order?.status === "refund_requested" || order?.refundStatus === "requested" || order?.refund_status === "pending_admin_approval";
}

export function isReviewedRefund(order) {
  return order?.status === "refunded" || ["rejected", "approved", "refunded"].includes(order?.refundStatus) || order?.refund_status === "rejected";
}

export function orderStatusInfo(order) {
  if (isPendingRefund(order)) return ORDER.refund_requested;
  const base = ORDER[order?.status] || { label: order?.status ? titleCase(order.status) : "Unknown", tone: "muted", next: "" };
  if (order?.refundStatus === "rejected" || order?.refund_status === "rejected") {
    return { ...base, refundNote: "Refund rejected" };
  }
  return base;
}
