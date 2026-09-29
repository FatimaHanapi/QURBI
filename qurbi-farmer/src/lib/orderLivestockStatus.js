import { qurbi } from "@/api/qurbiClient";

export function livestockStatusForOrder(order) {
  const status = String(order?.status || "").toLowerCase();
  const refundStatus = String(order?.refund_status || "").toLowerCase();

  if (refundStatus === "rejected" && ["return_requested", "refund_requested"].includes(status)) {
    return "Sold";
  }
  if (
    ["return_requested", "refund_requested", "return_refund", "refunded"].includes(status)
    || ["approved", "completed"].includes(refundStatus)
  ) {
    return "Available";
  }
  if (["completed", "delivered"].includes(status)) return "Sold";
  return null;
}

export async function reconcileOrderLivestockStatuses(orders, livestock) {
  const livestockById = new Map((livestock || []).map((item) => [item.id, item]));
  const desiredById = new Map();
  const handled = new Set();

  // fetchFarmerOrders returns newest orders first. The newest order for an
  // animal is the only one allowed to control its marketplace status.
  for (const order of orders || []) {
    const desiredStatus = livestockStatusForOrder(order);
    for (const item of order.items || []) {
      const livestockId = item.livestock_id || item.livestockId;
      if (!livestockId || handled.has(livestockId) || !livestockById.has(livestockId)) continue;
      handled.add(livestockId);
      if (desiredStatus) desiredById.set(livestockId, desiredStatus);
    }
  }

  const updates = [];
  const reconciled = (livestock || []).map((item) => {
    const desiredStatus = desiredById.get(item.id);
    if (item.reservationState === "Active") return item;
    if (!desiredStatus || item.status === desiredStatus) return item;
    // The backend marks a listing Sold itself when the purchase completes and
    // rejects Sold from clients (400), so only reflect it locally.
    if (desiredStatus !== "Sold") {
      updates.push(qurbi.entities.Livestock.update(item.id, { status: desiredStatus }));
    }
    return { ...item, status: desiredStatus };
  });

  await Promise.all(updates);
  return reconciled;
}
