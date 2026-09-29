// Compatibility facade for screens that still use the former entity-style
// calls. Every operation is backed by QURBI NestJS/MySQL; no Base44 request.
import apiClient, { resolveApiAssetUrl, uploadApi } from "@/api/apiClient";

const data = async (request) => {
  try {
    const response = await request;
    return response.data;
  } catch (error) {
    const responseMessage = error.response?.data?.message;
    if (Array.isArray(responseMessage)) error.message = responseMessage.join(". ");
    else if (responseMessage) error.message = responseMessage;
    throw error;
  }
};
const titleCase = (value) => value ? String(value).split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ") : value;
const slugify = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const STATUS_TO_API = { Available: "available", Reserved: "reserved", Sold: "sold", Unavailable: "unavailable", Draft: "draft", Open: "open", Cancelled: "cancelled" };
const BULK_STATUS_TO_API = { Available: "open", Draft: "draft", Sold: "sold", Cancelled: "cancelled" };
const REQUEST_TO_API = { Pending: "pending", Approved: "approved", Rejected: "rejected" };

const normalizeProfile = (item) => item && ({ ...item, state: item.farmState, address: item.farmAddressLine, city: item.farmCity, postcode: item.farmPostcode, verificationStatus: titleCase(item.verificationStatus === "verified" ? "approved" : item.verificationStatus) });
const normalizeSpecies = (item) => item && ({ ...item, image: item.imageUrl || "", status: item.isActive ? "Active" : "Inactive", created_date: item.createdAt });
const normalizeBreed = (item) => item && ({ ...item, species: item.species?.name || item.speciesName || "", image: item.imageUrl || "", status: item.isActive ? "Active" : "Inactive", created_date: item.createdAt });
function normalizeRequest(item) {
  if (!item) return item;
  let requestDetails = {};
  try {
    requestDetails = item.reason?.startsWith("{") ? JSON.parse(item.reason) : { description: item.reason || "" };
  } catch {
    requestDetails = { description: item.reason || "" };
  }
  return {
    ...requestDetails,
    ...item,
    userId: item.requestedByUserId,
    farmerId: item.requestedByUserId,
    species: item.species?.name || item.speciesName || "",
    status: titleCase(item.status),
    reviewReason: item.reviewNote,
    adminReason: item.reviewNote,
    created_date: item.createdAt,
  };
}
const normalizeUser = (item) => item && ({ ...item, name: item.fullName, full_name: item.fullName, created_date: item.createdAt, data: { name: item.fullName, role: item.role } });

function normalizeLivestock(item) {
  if (!item) return item;
  const attributes = item.attributes || {};
  return { ...attributes, ...item, ownerId: item.farmerId, species: item.species?.name || attributes.species || "", breed: item.breed?.name || attributes.breed || "Unspecified", gender: item.sex ? titleCase(item.sex) : attributes.gender, status: titleCase(item.status), speciesApprovalStatus: titleCase(item.speciesApprovalStatus), breedApprovalStatus: titleCase(item.breedApprovalStatus), disabled: Boolean(item.adminBlocked), featured: Boolean(item.isFeatured), state: attributes.state || attributes.farmLocation || "", coverImage: item.images?.[0] || attributes.coverImage || "", price: Number(item.price), weight: item.weightKg || attributes.weight || "", created_date: item.createdAt, updated_date: item.updatedAt };
}

function normalizeBulk(item, breeds = []) {
  if (!item) return item;
  const breedBreakdown = (item.breedBreakdown || []).map((group) => ({
    ...group,
    breed: breeds.find((breed) => breed.id === group.breedId)?.name || group.breed || "Unspecified",
  }));
  return { ...item, breedBreakdown, ownerId: item.farmerId, name: item.title, totalPrice: Number(item.price), coverImage: item.images?.[0] || "", species: item.species?.name || "", breed: item.breed?.name || "", status: item.status === "open" ? "Available" : titleCase(item.status), created_date: item.createdAt, updated_date: item.updatedAt };
}

function normalizeNotification(item) {
  if (!item) return item;
  return { ...item, message: item.body, orderId: item.relatedType === "order" ? item.relatedId : null, livestockId: item.relatedType === "livestock" ? item.relatedId : null, created_date: item.createdAt, priority: item.type === "refund" ? "Important" : "Normal", type: titleCase(item.type) };
}

function normalizeOrderItem(orderItem) {
  const metadata = orderItem.metadata || {};
  const titleParts = String(orderItem.titleSnapshot || "")
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    ...orderItem,
    livestock_id: orderItem.livestockId,
    bulk_listing_id: orderItem.bulkListingId,
    image_url: resolveApiAssetUrl(orderItem.imageSnapshot),
    species: metadata.species || titleParts[0] || "Livestock",
    breed: metadata.breed || titleParts.slice(1).join(" - ") || "Unspecified breed",
    price: Number(orderItem.unitPrice),
    total: Number(orderItem.lineTotal),
  };
}

function normalizeOrder(item) {
  if (!item) return item;
  const statusMap = { pending_payment: "pending", paid: "paid", preparing: "processing", in_transit: "shipped", delivered: "delivered", received: "completed", cancelled: "cancelled", refunded: "refunded" };
  const tracking = {};
  (item.trackingEvents || []).forEach((event) => { const stage = event.note?.match(/^(before|during|after)/i)?.[1]?.toLowerCase(); if (stage && event.images?.[0]) tracking[stage] = { image_url: resolveApiAssetUrl(event.images[0]), uploaded_at: event.createdAt }; });
  return { ...item, order_number: item.orderNumber, status: item.refundStatus === "requested" ? "refund_requested" : statusMap[item.status] || item.status, payment_status: item.paymentStatus, fulfillment_method: item.deliveryMethod === "self_pickup" ? "pickup" : "delivery", farmer_total: Number(item.subtotal), total_amount: Number(item.total), buyer_name: item.buyer?.fullName || "Buyer", buyer_phone: item.deliveryAddress?.recipientPhone, delivery_address: item.deliveryAddress, created_date: item.createdAt, tracking_photos: tracking, tracking_enabled: true, multi_farmer_order: false, items: (item.items || []).map(normalizeOrderItem) };
}

async function allSpecies() { return (await data(apiClient.get("/species"))).map(normalizeSpecies); }
async function allBreeds() { return (await data(apiClient.get("/breeds"))).map(normalizeBreed); }
async function currentUser() { return data(apiClient.get("/auth/me")); }
async function resolveSpeciesId(value) { return (await allSpecies()).find((row) => row.id === value || row.name?.toLowerCase() === String(value || "").toLowerCase())?.id; }
async function resolveBreedId(value, speciesId) { if (!value || value === "Unspecified") return undefined; return (await allBreeds()).find((row) => (row.id === value || row.name?.toLowerCase() === String(value).toLowerCase()) && (!speciesId || row.speciesId === speciesId))?.id; }

async function livestockPayload(input, partial = false) {
  const speciesId = input.speciesId || await resolveSpeciesId(input.species);
  if (!partial && !speciesId) throw new Error("Select an approved species before submitting the listing.");
  const breedId = input.breedId === "" || input.breed === "Unspecified"
    ? null
    : input.breedId || await resolveBreedId(input.breed, speciesId);
  const ageMonths = input.ageInputMode === "Age" && input.ageValue !== "" && input.ageValue != null ? Math.round(Number(input.ageValue) * (input.ageUnit === "Years" ? 12 : 1)) : input.ageMonths;
  const excluded = new Set(["ownerId", "speciesId", "breedId", "title", "tagNumber", "description", "gender", "sex", "ageMonths", "birthDate", "weightKg", "price", "currency", "images", "videos", "status", "marketplaceEligibleFrom", "attributes"]);
  const legacy = Object.fromEntries(Object.entries(input).filter(([key]) => !excluded.has(key)));
  const requestedStatus = input.status ? STATUS_TO_API[input.status] || input.status : undefined;
  return Object.fromEntries(Object.entries({ speciesId, breedId, title: input.title || (input.species ? `${input.species}${input.breed && input.breed !== "Unspecified" ? ` - ${input.breed}` : ""}` : undefined), tagNumber: input.tagNumber, description: input.description, sex: input.sex || (input.gender ? String(input.gender).toLowerCase() : undefined), ageMonths, birthDate: input.birthDate || undefined, weightKg: input.weightKg || (input.weight ? String(input.weight) : undefined), price: input.price != null ? String(input.price) : undefined, currency: input.currency || (partial ? undefined : "MYR"), images: input.images, videos: input.videos, status: !partial && input.breedRequestId ? "draft" : requestedStatus, marketplaceEligibleFrom: input.marketplaceEligibleFrom || undefined, attributes: { ...(input.attributes || {}), ...legacy, originalStatus: !partial && input.breedRequestId ? requestedStatus : input.originalStatus, species: input.species, breed: input.breed } }).filter(([, value]) => value !== undefined && value !== ""));
}

async function bulkPayload(input, partial = false) {
  const groups = input.breedBreakdown || [];
  const speciesNames = new Set(groups.map((row) => row.species).filter(Boolean));
  if (speciesNames.size > 1) throw new Error("A bulk listing can contain only one species. Create a separate listing for each species.");
  const speciesId = input.speciesId || await resolveSpeciesId(input.species || groups[0]?.species);
  if (!partial && !speciesId) throw new Error("Select an approved species before saving the bulk listing.");
  const breedIds = await Promise.all(groups.map((row) => resolveBreedId(row.breedId || row.breed, speciesId)));
  const breakdown = groups.map((row, index) => ({ breedId: breedIds[index], count: Number(row.count ?? Number(row.maleCount || 0) + Number(row.femaleCount || 0)), maleCount: Number(row.maleCount || 0), femaleCount: Number(row.femaleCount || 0) })).filter((row) => row.breedId);
  return Object.fromEntries(Object.entries({ speciesId, breedId: breakdown.length === 1 ? breakdown[0].breedId : input.breedId, title: input.title || input.name, description: input.description, maleCount: input.maleCount != null ? Number(input.maleCount) : undefined, femaleCount: input.femaleCount != null ? Number(input.femaleCount) : undefined, breedBreakdown: groups.length ? breakdown : undefined, price: input.price != null || input.totalPrice != null ? String(input.price ?? input.totalPrice) : undefined, currency: input.currency || (partial ? undefined : "MYR"), images: input.images, videos: input.videos, state: input.state, status: input.status ? BULK_STATUS_TO_API[input.status] || input.status : undefined }).filter(([, value]) => value !== undefined && value !== ""));
}

const FarmerProfile = { list: async () => (await data(apiClient.get("/farmer-profiles"))).map(normalizeProfile), filter: async ({ userId } = {}) => userId ? ((row) => row ? [normalizeProfile(row)] : [])(await data(apiClient.get(`/farmer-profiles/by-user/${userId}`))) : FarmerProfile.list(), update: async (id, input) => normalizeProfile(await data(apiClient.patch(`/farmer-profiles/${id}`, Object.fromEntries(Object.entries({ farmName: input.farmName, farmAddressLine: input.farmAddressLine ?? input.address, farmCity: input.farmCity ?? input.city, farmState: input.farmState ?? input.state, farmPostcode: input.farmPostcode ?? input.postcode, farmDescription: input.farmDescription, businessRegNo: input.businessRegNo, logoUrl: input.logoUrl, deliveryPreference: input.deliveryPreference }).filter(([, value]) => value !== undefined))))) };
const Livestock = {
  list: async () => {
    const viewer = await currentUser();
    const params = { page: 1, limit: 100, ...(viewer.role === "farmer" ? { farmerId: viewer.id } : {}) };
    return (await data(apiClient.get("/livestock", { params }))).data.map(normalizeLivestock);
  },
  filter: async (where = {}) => {
    const page = await data(apiClient.get("/livestock", { params: { farmerId: where.ownerId || where.farmerId, status: STATUS_TO_API[where.status] || where.status, page: 1, limit: 100 } }));
    return page.data.map(normalizeLivestock).filter((row) => Object.entries(where).every(([key, value]) => key === "ownerId" ? row.ownerId === value : key === "farmerId" ? row.farmerId === value : key === "status" ? String(row.status).toLowerCase() === String(titleCase(value)).toLowerCase() : row[key] === value));
  },
  get: async (id) => normalizeLivestock(await data(apiClient.get(`/livestock/${id}`))),
  create: async (input) => normalizeLivestock(await data(apiClient.post("/livestock", await livestockPayload(input)))),
  update: async (id, input) => {
    let updated = null;
    // `marketplaceVisible` is derived by the normal farmer form from status,
    // approval and expiry. It must never call the admin-only block endpoint.
    // Only the admin screens send `disabled` for an explicit override.
    if (input.disabled !== undefined) {
      const blocked = input.disabled;
      updated = await data(apiClient.patch(`/livestock/${id}/marketplace-visibility`, {
        blocked,
        reason: blocked ? input.marketplaceVisibilityReason || "Hidden by administrator" : undefined,
      }));
    }
    if (input.featured !== undefined || input.isFeatured !== undefined) {
      updated = await data(apiClient.patch(`/livestock/${id}/featured`, { featured: input.featured ?? input.isFeatured }));
    }
    const payload = await livestockPayload(input, true);
    delete payload.attributes?.disabled;
    delete payload.attributes?.marketplaceVisible;
    delete payload.attributes?.marketplaceVisibilityReason;
    delete payload.attributes?.featured;
    delete payload.attributes?.isFeatured;
    if (payload.attributes && Object.keys(payload.attributes).length) {
      const existing = await data(apiClient.get(`/livestock/${id}`));
      payload.attributes = { ...(existing.attributes || {}), ...payload.attributes };
    }
    if (Object.keys(payload).some((key) => key !== "attributes") || Object.keys(payload.attributes || {}).length) {
      updated = await data(apiClient.patch(`/livestock/${id}`, payload));
    }
    return normalizeLivestock(updated || await data(apiClient.get(`/livestock/${id}`)));
  },
  delete: (id) => data(apiClient.delete(`/livestock/${id}`)),
};

const BulkListing = {
  list: async () => {
    const [viewer, breeds] = await Promise.all([currentUser(), allBreeds()]);
    const params = viewer.role === "farmer" ? { farmerId: viewer.id } : {};
    return (await data(apiClient.get("/bulk-listings", { params }))).map((item) => normalizeBulk(item, breeds));
  },
  filter: async (where = {}) => {
    const [items, breeds] = await Promise.all([
      data(apiClient.get("/bulk-listings", { params: { farmerId: where.ownerId || where.farmerId, status: BULK_STATUS_TO_API[where.status] || where.status } })),
      allBreeds(),
    ]);
    return items.map((item) => normalizeBulk(item, breeds));
  },
  get: async (id) => {
    const [item, breeds] = await Promise.all([data(apiClient.get(`/bulk-listings/${id}`)), allBreeds()]);
    return normalizeBulk(item, breeds);
  },
  create: async (input) => normalizeBulk(await data(apiClient.post("/bulk-listings", await bulkPayload(input))), await allBreeds()),
  update: async (id, input) => normalizeBulk(await data(apiClient.patch(`/bulk-listings/${id}`, await bulkPayload(input, true))), await allBreeds()),
  delete: (id) => data(apiClient.delete(`/bulk-listings/${id}`)),
};
const Species = { list: allSpecies, get: async (id) => normalizeSpecies(await data(apiClient.get(`/species/${id}`))), create: async (input) => normalizeSpecies(await data(apiClient.post("/species", { name: input.name, slug: input.slug || slugify(input.name), description: input.description || undefined, imageUrl: input.imageUrl || input.image || undefined, maxShares: Number(input.maxShares || 1), isActive: input.status ? input.status === "Active" : true }))), update: async (id, input) => normalizeSpecies(await data(apiClient.patch(`/species/${id}`, Object.fromEntries(Object.entries({ name: input.name, slug: input.name ? input.slug || slugify(input.name) : undefined, description: input.description, imageUrl: input.imageUrl ?? input.image, isActive: input.status != null ? input.status === "Active" : undefined }).filter(([, value]) => value !== undefined))))) };
const Breed = { list: allBreeds, filter: async (where = {}) => (await allBreeds()).filter((row) => Object.entries(where).every(([key, value]) => String(row[key] || "").toLowerCase() === String(value || "").toLowerCase())), get: async (id) => normalizeBreed(await data(apiClient.get(`/breeds/${id}`))), create: async (input) => { const speciesId = input.speciesId || await resolveSpeciesId(input.species); return normalizeBreed(await data(apiClient.post("/breeds", { speciesId, name: input.name, slug: input.slug || slugify(input.name), description: input.description || undefined, imageUrl: input.imageUrl || input.image || undefined, isActive: input.status ? input.status === "Active" : true }))); }, update: async (id, input) => normalizeBreed(await data(apiClient.patch(`/breeds/${id}`, Object.fromEntries(Object.entries({ name: input.name, slug: input.name ? input.slug || slugify(input.name) : undefined, description: input.description, imageUrl: input.imageUrl ?? input.image, isActive: input.status != null ? input.status === "Active" : undefined }).filter(([, value]) => value !== undefined))))) };

function requestEntity(path, isBreed) {
  return {
    list: async () => (await data(apiClient.get(path, { params: { page: 1, limit: 100 } }))).data.map(normalizeRequest),
    filter: async (where = {}) => (await data(apiClient.get(path, { params: { requestedByUserId: where.userId || where.requestedByUserId, status: REQUEST_TO_API[where.status] || where.status, page: 1, limit: 100 } }))).data.map(normalizeRequest),
    get: async (id) => normalizeRequest(await data(apiClient.get(`${path}/${id}`))),
    create: async (input) => {
      const requestDetails = {
        description: input.description || input.reason || "",
        referenceImage: input.referenceImage || "",
        livestockId: input.livestockId || "",
      };
      const body = { proposedName: input.proposedName, reason: JSON.stringify(requestDetails) };
      if (isBreed) body.speciesId = input.speciesId || await resolveSpeciesId(input.species);
      return normalizeRequest(await data(apiClient.post(path, body)));
    },
    update: async (id, input) => normalizeRequest(await data(apiClient.patch(`${path}/${id}/review`, { approve: input.status === "Approved" || input.approve === true, reviewNote: input.adminReason || input.reviewReason || input.reviewNote || undefined }))),
  };
}

const FarmerNotification = { list: async () => (await data(apiClient.get("/notifications", { params: { audience: "farmer" } }))).map(normalizeNotification), update: async (id, input) => input.isRead ? normalizeNotification(await data(apiClient.patch(`/notifications/${id}/read`))) : null, create: async (input) => normalizeNotification(await data(apiClient.post("/notifications", { userId: input.userId || input.farmerId, audience: "farmer", type: "request_update", title: input.title || "QURBI update", body: input.message || input.body || "", linkUrl: input.linkUrl || undefined, relatedType: input.orderId ? "order" : input.livestockId ? "livestock" : undefined, relatedId: input.orderId || input.livestockId || undefined }))), subscribe: () => () => {} };
const User = { list: async () => (await data(apiClient.get("/users", { params: { page: 1, limit: 100 } }))).data.map(normalizeUser), filter: async (where = {}) => (await data(apiClient.get("/users", { params: { role: where.role, status: where.status, page: 1, limit: 100 } }))).data.map(normalizeUser), get: async (id) => normalizeUser(await data(apiClient.get(`/users/${id}`))), update: async (id, input) => normalizeUser(await data(apiClient.patch(`/users/${id}`, input))) };
const FarmVerification = { filter: async ({ userId } = {}) => { const profile = userId ? await data(apiClient.get(`/farmer-profiles/by-user/${userId}`)) : null; if (userId && !profile) return []; const page = await data(apiClient.get("/farm-verifications", { params: { farmerProfileId: profile?.id, page: 1, limit: 100 } })); return page.data.map((row) => ({ ...row.documents, ...row, policySignature: row.signatureUrl, created_date: row.createdAt, status: titleCase(row.status === "verified" ? "approved" : row.status) })); } };

async function fetchOrders(orderId, admin = false) { if (orderId) return normalizeOrder(await data(apiClient.get(`/orders/${orderId}`))); const response = await data(apiClient.get(admin ? "/orders/admin" : "/orders", admin ? { params: { page: 1, limit: 100 } } : undefined)); return (Array.isArray(response) ? response : response.data || []).map(normalizeOrder); }
const functions = { invoke: async (name, input = {}) => {
  if (name === "fetchFarmerOrders") return { data: input.orderId ? { order: await fetchOrders(input.orderId) } : { orders: await fetchOrders() } };
  if (name === "fetchAdminBuyerOrders") return { data: { orders: await fetchOrders(null, true) } };
  if (name === "fetchAisyahUsers") return { data: { users: await User.filter({ role: "buyer" }) } };
  if (name === "checkLivestockReservation") return { data: { livestock: await Livestock.get(input.livestockId) } };
  if (name === "syncFarmerNotifications" || name === "syncBuyerOrders") return { data: { ok: true } };
  if (name === "uploadFarmerTrackingPhoto") { const targets = { before: "preparing", during: "in_transit", after: "delivered" }; await data(apiClient.patch(`/orders/${input.orderId}/advance`, { status: targets[input.stage], note: `${input.stage} delivery evidence`, images: [input.imageUrl] })); return { data: { order: await fetchOrders(input.orderId) } }; }
  if (name === "reviewBuyerRefund") { const updated = await data(apiClient.patch(`/orders/${input.orderId}/refund-review`, { approve: input.approve ?? input.decision === "approve", note: input.reason || input.note || undefined })); return { data: { order: normalizeOrder(updated) } }; }
  throw new Error(`Unsupported operation: ${name}`);
} };

export const qurbi = { entities: { FarmerProfile, FarmVerification, Livestock, BulkListing, Species, Breed, SpeciesRequest: requestEntity("/species-requests", false), BreedRequest: requestEntity("/breed-requests", true), FarmerNotification, User }, functions, integrations: { Core: { UploadFile: async ({ file }) => { const result = await uploadApi.upload(file, "public"); return { file_url: result.fileUrl }; } } } };
