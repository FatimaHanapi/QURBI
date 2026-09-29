// Order item images and proof photos arrive as API-relative paths
// ("/uploads/public/..."); resolve them against the API origin.
const API_ORIGIN = String(import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api")
  .replace(/\/$/, "")
  .replace(/\/api$/, "");

/** @param {unknown} value */
export function accountMediaUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  const reference = value.trim();
  if (/^(?:https?:|data:|blob:)/i.test(reference)) return reference;
  return `${API_ORIGIN}/${reference.replace(/^\//, "")}`;
}

/**
 * Farmer proof photos are stored on tracking events whose note starts with the
 * stage name ("before delivery evidence"). Merge them with any photos already on
 * the order (e.g. the buyer's locally previewed "received" photo).
 * @param {any} order
 * @returns {Record<string, { image_url: string, uploaded_at?: string }>}
 */
export function orderProofPhotos(order) {
  /** @type {Record<string, { image_url: string, uploaded_at?: string }>} */
  const photos = {};
  const events = Array.isArray(order?.tracking_events) ? order.tracking_events : [];
  for (const event of events) {
    const stage = String(event?.note || "").match(/^(before|during|after)/i)?.[1]?.toLowerCase();
    const image = Array.isArray(event?.images) ? event.images[0] : "";
    if (stage && image) photos[stage] = { image_url: accountMediaUrl(image), uploaded_at: event.createdAt };
  }
  const proofImages = Array.isArray(order?.receivedProofImages) ? order.receivedProofImages : [];
  if (proofImages[0]) photos.received = { image_url: accountMediaUrl(proofImages[0]) };
  const existing = order?.tracking_photos || {};
  for (const key of Object.keys(existing)) {
    if (existing[key]?.image_url) photos[key] = existing[key];
  }
  return photos;
}
