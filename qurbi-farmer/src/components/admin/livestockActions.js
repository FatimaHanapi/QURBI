import apiClient from "@/api/apiClient";
import { qurbi } from "@/api/qurbiClient";
import { malaysiaState } from "@/lib/agri";

/** Admin override: hide from / show on the marketplace (existing behaviour, incl. the state requirement). */
export async function setListingHidden(item, hidden, fallbackState) {
  let state = malaysiaState(item.state, item.farmLocation, fallbackState);
  if (!state && item.ownerId) {
    const profiles = await qurbi.entities.FarmerProfile.filter({ userId: item.ownerId }, "-created_date", 1);
    state = malaysiaState(profiles?.[0]?.state);
  }
  if (!state) throw new Error("This listing has no state. Ask the farmer to update the livestock location first.");
  const update = { disabled: hidden, state };
  await qurbi.entities.Livestock.update(item.id, update);
  return update;
}

/** Admin homepage curation (PATCH /livestock/:id/featured). */
export async function setListingFeatured(item, featured) {
  try {
    const response = await apiClient.patch(`/livestock/${item.id}/featured`, { featured });
    return { featured: Boolean(response.data?.isFeatured ?? featured) };
  } catch (error) {
    const message = error.response?.data?.message;
    if (message) error.message = Array.isArray(message) ? message.join(". ") : message;
    throw error;
  }
}
