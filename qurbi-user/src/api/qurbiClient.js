import apiClient, { getAccessToken } from "@/api/apiClient";

const API_ORIGIN = new URL(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api",
  window.location.origin,
).origin;

const toSnake = (key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const toCamel = (key) => key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

function mapKeys(value, keyMapper) {
  if (Array.isArray(value)) return value.map((item) => mapKeys(item, keyMapper));
  const isFile = typeof File !== "undefined" && value instanceof File;
  const isBlob = typeof Blob !== "undefined" && value instanceof Blob;
  if (!value || typeof value !== "object" || isFile || isBlob) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [keyMapper(key), mapKeys(item, keyMapper)]),
  );
}

function fromApi(value) {
  if (Array.isArray(value)) return value.map(fromApi);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) => {
      const normalized = fromApi(item);
      const snakeKey = toSnake(key);
      return snakeKey === key ? [[key, normalized]] : [[key, normalized], [snakeKey, normalized]];
    }),
  );
}

function currentUserId() {
  const token = getAccessToken();
  if (!token) {
    try {
      return JSON.parse(localStorage.getItem("qurbi_firebase_user") || "null")?.id || null;
    } catch {
      return null;
    }
  }
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).sub || null;
  } catch {
    return null;
  }
}

async function request(config) {
  const response = await apiClient({
    ...config,
    data: config.data ? mapKeys(config.data, toCamel) : config.data,
  });
  return fromApi(response.data);
}

function wrap(data) {
  return { data };
}

function collectionFrom(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return null;
}

function mediaUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  const reference = value.trim();
  if (/^(?:https?:|data:|blob:)/i.test(reference)) return reference;
  return `${API_ORIGIN}/${reference.replace(/^\//, "")}`;
}

function farmDetails(item) {
  const profile = item?.farmer?.farmerProfile || item?.farmer?.farmer_profile || {};
  const address = [profile.farmAddressLine, profile.farmCity, profile.farmState, profile.farmPostcode]
    .filter(Boolean)
    .join(", ");
  return {
    ownerId: item.farmerId,
    farmer_name: item.farmer?.fullName || "Unknown Farmer",
    farm_name: profile.farmName || "",
    farm_address: address,
    farm_state: profile.farmState || "",
    farmLocation: address,
    farm_location: address,
  };
}

function livestockForUser(item) {
  if (!item) return item;
  const attributes = item.attributes || {};
  const images = (item.images || []).map(mediaUrl).filter(Boolean);
  const videos = (item.videos || []).map(mediaUrl).filter(Boolean);
  return {
    ...item,
    ...farmDetails(item),
    images,
    videos,
    name: item.title,
    species: item.species?.name || item.species?.slug || "Livestock",
    breed: item.breed?.name || "",
    category: item.category?.name || "",
    gender: item.sex || "",
    age: item.ageMonths == null ? "" : `${item.ageMonths} months`,
    weight: item.weightKg == null ? "" : Number(item.weightKg),
    coverImage: images[0] || "",
    grade: attributes.grade || "",
    height: attributes.height || attributes.heightCm || "",
    bodyLength: attributes.bodyLength || attributes.bodyLengthCm || "",
    chestGirth: attributes.chestGirth || attributes.chestGirthCm || "",
    color: attributes.color || "",
    earTag: item.tagNumber || attributes.earTag || "",
    rfid: attributes.rfid || "",
    healthRecord: attributes.healthRecord || "",
    vaccinationRecord: attributes.vaccinationRecord || "",
    specialNotes: attributes.specialNotes || "",
    created_date: item.createdAt,
  };
}

function bulkListingForUser(item) {
  if (!item) return item;
  const maleCount = Number(item.maleCount || 0);
  const femaleCount = Number(item.femaleCount || 0);
  const images = (item.images || []).map(mediaUrl).filter(Boolean);
  const videos = (item.videos || []).map(mediaUrl).filter(Boolean);
  const breedBreakdown = Array.isArray(item.breedBreakdown)
    ? item.breedBreakdown.map((entry, index, entries) => ({
        ...entry,
        species: entry.species || item.species?.name || "",
        breed:
          entry.breed ||
          entry.name ||
          (entry.breedId === item.breed?.id || entries.length === 1
            ? item.breed?.name
            : "") ||
          `Breed ${index + 1}`,
      }))
    : item.breed?.name
      ? [{ breed: item.breed.name, species: item.species?.name || "", count: maleCount + femaleCount }]
      : [];
  return {
    ...item,
    ...farmDetails(item),
    images,
    videos,
    name: item.title,
    ownerId: item.farmerId,
    coverImage: images[0] || "",
    maleCount,
    femaleCount,
    totalAnimals: maleCount + femaleCount,
    breedBreakdown,
    state: item.state || item.farmer?.farmerProfile?.farmState || "",
    totalPrice: Number(item.price || 0),
    created_date: item.createdAt,
  };
}

function orderForUser(order) {
  if (!order) return order;
  const items = (order.items || []).map((item) => ({
    ...item,
    item_type: item.itemType === "bulk_share" ? "bulk" : "livestock",
    livestock_id: item.livestockId,
    bulk_listing_id: item.bulkListingId,
    breed: item.itemType === "livestock" ? item.titleSnapshot : "",
    listing_name: item.itemType === "bulk_share" ? item.titleSnapshot : "",
    image: item.imageSnapshot || "",
    price_per_head: Number(item.unitPrice || 0),
    total: Number(item.lineTotal || 0),
  }));
  return {
    ...order,
    items,
    subtotal: Number(order.subtotal || 0),
    delivery_fee: Number(order.deliveryFee || 0),
    discount: Number(order.discount || 0),
    total: Number(order.total || 0),
    fulfillment_method: order.deliveryMethod === "self_pickup" ? "pickup" : "delivery",
    tracking_events: order.trackingEvents || [],
  };
}

function availabilityFor(item, availableStatus) {
  if (!item) return { available: false, state: "not_found" };
  const available = item.status === availableStatus;
  return { available, state: available ? "available" : item.status || "unavailable", item };
}

const functionHandlers = {
  /** @param {{ id?: string }} [payload] */
  async fetchLivestock({ id } = {}) {
    const response = await request({ method: "get", url: id ? `/livestock/${id}` : "/livestock" });
    const items = collectionFrom(response);
    const livestock = items
      ? items.filter((item) => item.status === "available").map(livestockForUser)
      : livestockForUser(response);
    return wrap({ livestock });
  },
  /** @param {{ id?: string }} [payload] */
  async fetchBulkListings({ id } = {}) {
    const response = await request({ method: "get", url: id ? `/bulk-listings/${id}` : "/bulk-listings" });
    const items = collectionFrom(response);
    const bulkListings = items
      ? items.filter((item) => item.status === "open").map(bulkListingForUser)
      : bulkListingForUser(response);
    return wrap({ bulkListings });
  },
  async checkLivestockAvailability({ livestockIds = [] } = {}) {
    const entries = await Promise.all(livestockIds.map(async (id) => {
      try {
        return [id, availabilityFor(await request({ method: "get", url: `/livestock/${id}` }), "available")];
      } catch {
        return [id, availabilityFor(null, "available")];
      }
    }));
    return wrap({ availability: Object.fromEntries(entries) });
  },
  async checkBulkListingAvailability({ bulkListingIds = [] } = {}) {
    const entries = await Promise.all(bulkListingIds.map(async (id) => {
      try {
        return [id, availabilityFor(await request({ method: "get", url: `/bulk-listings/${id}` }), "open")];
      } catch {
        return [id, availabilityFor(null, "open")];
      }
    }));
    return wrap({ availability: Object.fromEntries(entries) });
  },
  async fetchMyNotifications() {
    const notifications = await request({
      method: "get",
      url: "/notifications",
      params: { userId: currentUserId(), audience: "buyer" },
    });
    return wrap({ notifications });
  },
  async markMyNotificationRead({ notificationId }) {
    return wrap({ notification: await request({ method: "patch", url: `/notifications/${notificationId}/read` }) });
  },
  /** @param {{ notificationId?: string, clearAll?: boolean }} [payload] */
  async clearMyNotifications({ notificationId, clearAll } = {}) {
    if (clearAll) {
      await request({ method: "patch", url: "/notifications/clear-all", data: { userId: currentUserId(), audience: "buyer" } });
      return wrap({ success: true });
    }
    return wrap({ notification: await request({ method: "patch", url: `/notifications/${notificationId}/clear` }) });
  },
  async getMyProfile() {
    const user = await request({ method: "get", url: "/auth/me" });
    return wrap({ profile: { name: user.full_name, email: user.email, phone: user.phone || "" } });
  },
  async updateMyProfile({ name, phone }) {
    const user = await request({ method: "patch", url: `/users/${currentUserId()}`, data: { fullName: name, phone } });
    return wrap({ profile: { name: user.full_name, email: user.email, phone: user.phone || "" } });
  },
  /** @param {{ orderId?: string }} [payload] */
  async fetchMyOrders({ orderId } = {}) {
    if (orderId) return wrap({ order: orderForUser(await request({ method: "get", url: `/orders/${orderId}` })) });
    const response = await request({ method: "get", url: "/orders", params: { buyerId: currentUserId() } });
    const orders = collectionFrom(response) || [];
    return wrap({ orders: orders.map(orderForUser) });
  },
  async cancelMyOrder({ orderId, reason = "Cancelled by buyer" }) {
    const order = await request({ method: "patch", url: `/orders/${orderId}/cancel`, data: { reason, userId: currentUserId() } });
    return wrap({ order: orderForUser(order) });
  },
  async hideMyOrderHistory({ orderIds = [] }) {
    await Promise.all(orderIds.map((id) => request({ method: "patch", url: `/orders/${id}/hide-from-buyer-history`, data: { hidden: true } })));
    return wrap({ success: true });
  },
  async confirmMyOrderReceived({ orderId }) {
    const order = await request({ method: "patch", url: `/orders/${orderId}/received`, data: { proofImages: [], userId: currentUserId() } });
    return wrap({ order: orderForUser(order) });
  },
  async requestMyOrderRefund({ orderId, reason }) {
    const order = await request({ method: "patch", url: `/orders/${orderId}/refund-request`, data: { reason } });
    return wrap({ order: orderForUser(order) });
  },
  async markPurchasedLivestock({ orderId }) {
    return wrap({ order: orderForUser(await request({ method: "get", url: `/orders/${orderId}` })) });
  },
  async createCheckout({ items = [], fulfillmentMethod = "delivery", deliveryAddress = {} }) {
    const userId = currentUserId();
    await Promise.all(items.map((item) => request({
      method: "post",
      url: "/cart-items",
      data: {
        userId,
        itemType: item.item_type === "bulk" ? "bulk_share" : "livestock",
        livestockId: item.item_type === "bulk" ? undefined : item.livestock_id || item.id,
        bulkListingId: item.item_type === "bulk" ? item.bulk_listing_id || item.id : undefined,
        quantity: item.quantity || 1,
      },
    })));
    const orders = await request({
      method: "post",
      url: "/orders/checkout",
      data: {
        buyerId: userId,
        deliveryMethod: fulfillmentMethod === "pickup" ? "self_pickup" : "delivery",
        deliveryAddress,
      },
    });
    const mappedOrders = orders.map(orderForUser);
    const firstOrder = mappedOrders[0];
    return wrap({ orders: mappedOrders, order: firstOrder, url: firstOrder ? `/orders/${firstOrder.id}` : "/orders" });
  },
  async saveMyReceivedOrderProof() {
    throw new Error("The NestJS backend does not yet expose a proof-upload endpoint.");
  },
  async createTestOrder() {
    throw new Error("Test-order creation is not available through the current NestJS API.");
  },
};

const entity = (path) => ({
  list: async () => request({ method: "get", url: path }),
  create: async (data) => request({ method: "post", url: path, data }),
  update: async (id, data) => request({ method: "patch", url: `${path}/${id}`, data }),
  delete: async (id) => request({ method: "delete", url: `${path}/${id}` }),
});

export const qurbiApi = {
  functions: {
    invoke(name, payload = {}) {
      const handler = functionHandlers[name];
      if (!handler) return Promise.reject(new Error(`Unsupported QURBI API operation: ${name}`));
      return handler(payload);
    },
  },
  entities: {
    Breed: entity("/breeds"),
    LivestockCategory: entity("/livestock-categories"),
    Order: { create: async (draft) => ({ ...draft, id: `pending-${Date.now()}` }) },
  },
  integrations: {
    Core: {
      UploadFile: async () => {
        throw new Error("The NestJS backend does not yet expose a file-upload endpoint.");
      },
    },
  },
};
