import { qurbiApi } from "@/api/qurbiClient";

export async function checkLivestockAvailability(livestockIds) {
  const ids = [...new Set((livestockIds || []).filter(Boolean))];
  if (!ids.length) return {};
  const response = await qurbiApi.functions.invoke("checkLivestockAvailability", { livestockIds: ids });
  return response.data?.availability || {};
}

export async function checkBulkListingAvailability(bulkListingIds) {
  const ids = [...new Set((bulkListingIds || []).filter(Boolean))];
  if (!ids.length) return {};
  const response = await qurbiApi.functions.invoke("checkBulkListingAvailability", { bulkListingIds: ids });
  return response.data?.availability || {};
}

export async function checkCartAvailability(items) {
  const livestock = items.filter((item) => item.item_type !== "bulk");
  const bulk = items.filter((item) => item.item_type === "bulk");
  const [livestockAvailability, bulkAvailability] = await Promise.all([
    checkLivestockAvailability(livestock.map((item) => item.livestock_id || item.id)),
    checkBulkListingAvailability(bulk.map((item) => item.bulk_listing_id || item.id)),
  ]);
  return Object.fromEntries(items.map((item) => {
    const id = item.item_type === "bulk" ? item.bulk_listing_id || item.id : item.livestock_id || item.id;
    return [item.key || id, (item.item_type === "bulk" ? bulkAvailability : livestockAvailability)[id]];
  }));
}

export function availabilityMessage(result) {
  if (result?.state === "reserved") return "This livestock is currently reserved by another buyer.";
  if (result?.state === "reserved_by_you") return "Complete payment from your existing To Pay order.";
  if (result?.state === "not_found") return "This livestock listing could not be verified. Please refresh and try again.";
  if (["marketplace_hidden", "species_not_approved", "breed_not_approved"].includes(result?.state)) {
    return "This livestock listing is not approved for the marketplace.";
  }
  if (result?.state === "below_marketplace_age") {
    return `This livestock has not reached the ${result.minimumAge}-month marketplace age requirement.`;
  }
  return "This livestock is no longer available.";
}
