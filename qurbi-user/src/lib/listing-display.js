import { extractState } from "@/lib/livestock-data";

// Display helpers shared by the buyer shopping screens (Home, Browse, detail,
// cart, payment). They only read fields the API already returns.

/**
 * The farmer-entered listing title ("Kambing Boer Jantan Premium"), falling
 * back to breed / species for older listings without one.
 * @param {any} listing
 * @param {string} [fallback]
 */
export function listingTitle(listing, fallback = "") {
  return (
    String(listing?.title || listing?.name || "").trim() ||
    listing?.breed ||
    listing?.species ||
    fallback
  );
}

/**
 * The state the animal is listed in. Listings store their own state in
 * `attributes.state`; the farm's state is only a fallback.
 * @param {any} listing
 */
export function listingState(listing) {
  const attributes = listing?.attributes || {};
  return (
    extractState(attributes.state) ||
    String(attributes.state || "").trim() ||
    extractState(attributes.farmLocation) ||
    extractState(listing?.state) ||
    String(listing?.state || "").trim() ||
    listing?.farm_state ||
    extractState(listing?.farmLocation) ||
    ""
  );
}

/** @param {unknown} value */
export function genderKey(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["male", "jantan", "m"].includes(normalized)) return "male";
  if (["female", "betina", "f"].includes(normalized)) return "female";
  return "";
}

/**
 * Human label for a gender value ("male" -> "Male" / "Jantan").
 * @param {(key: string, options?: any) => string} t
 * @param {unknown} value
 */
export function genderLabel(t, value) {
  const key = genderKey(value);
  if (!key) return String(value || "");
  return t(`shopflow:labels.gender.${key}`);
}

const KNOWN_STATUSES = [
  "available",
  "open",
  "reserved",
  "sold",
  "closed",
  "draft",
  "expired",
  "unavailable",
  "pending",
];

/** @param {unknown} value */
export function statusKey(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return KNOWN_STATUSES.includes(normalized) ? normalized : "";
}

/**
 * Human label for a listing status ("available" -> "Available").
 * @param {(key: string, options?: any) => string} t
 * @param {unknown} value
 */
export function statusLabel(t, value) {
  const key = statusKey(value);
  if (key) return t(`shopflow:labels.status.${key}`);
  const text = String(value || "").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

/** @param {unknown} value */
export function isOpenForSale(value) {
  return ["available", "open"].includes(statusKey(value));
}

/**
 * "30 months" / "30 bulan" from ageMonths, falling back to the API text.
 * @param {(key: string, options?: any) => string} t
 * @param {any} listing
 */
export function ageLabel(t, listing) {
  const months = listing?.ageMonths ?? listing?.age_months;
  if (months !== null && months !== undefined && months !== "" && Number.isFinite(Number(months))) {
    return t("shopflow:labels.ageMonths", { count: Number(months) });
  }
  return listing?.age || "";
}

/** @param {any} listing */
export function listingImage(listing) {
  const first = [listing?.coverImage, ...(listing?.images || [])]
    .map((image) => (typeof image === "string" ? image.trim() : image?.url || image?.file_url || ""))
    .find(Boolean);
  return first || "";
}
