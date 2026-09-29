// One mapping from raw order data (status + payment/refund state) to what the
// buyer sees: a human label, a chip tone, the My Orders tab it belongs to and
// the next thing the buyer can do. Every account page uses this so an order
// never shows two different labels in two places.

/** @typedef {"warn" | "info" | "action" | "success" | "muted" | "danger"} StatusTone */
/** @typedef {"to-pay" | "to-ship" | "to-receive" | "completed" | "return-refund"} OrderTabKey */
/** @typedef {"pay" | "track" | "confirm" | "receipt" | "details" | "refund"} NextAction */
/**
 * @typedef {{
 *   key: string,
 *   labelKey: string,
 *   hintKey: string,
 *   tone: StatusTone,
 *   tab: OrderTabKey,
 *   next: NextAction,
 * }} OrderStatusInfo
 */

export const ORDER_TABS = [
  { key: "to-pay", labelKey: "orders.tabs.toPay" },
  { key: "to-ship", labelKey: "orders.tabs.toShip" },
  { key: "to-receive", labelKey: "orders.tabs.toReceive" },
  { key: "completed", labelKey: "orders.tabs.completed" },
  { key: "return-refund", labelKey: "orders.tabs.returnRefund" },
];

const PAYMENT_STATUSES = ["pending", "pending_payment", "to_pay"];
const PREPARING_STATUSES = ["preparing", "to_ship", "processing"];
const TRANSIT_STATUSES = ["in_transit", "shipped", "to_receive", "delivering"];
const COMPLETED_STATUSES = ["completed", "received"];
const LEGACY_REFUND_STATUSES = ["return_requested", "refund_requested", "return_refund"];

/** Statuses where the buyer can upload a received photo / confirm receipt. */
export const RECEIVABLE_STATUSES = [...TRANSIT_STATUSES, "delivered"];

/** Statuses that count as paid (receipt available). */
export const PAID_STATUSES = ["paid", ...PREPARING_STATUSES, ...TRANSIT_STATUSES, "delivered", ...COMPLETED_STATUSES];

/** @param {any} order */
export const orderRefundStatus = (order) =>
  String(order?.refund_status ?? order?.refundStatus ?? "").toLowerCase();

/** @param {any} order */
export const orderStatusKey = (order) => String(order?.status || "").toLowerCase();

/**
 * @param {string} key
 * @param {StatusTone} tone
 * @param {OrderTabKey} tab
 * @param {NextAction} next
 * @returns {OrderStatusInfo}
 */
const info = (key, tone, tab, next) => ({
  key,
  labelKey: `status.${key}.label`,
  hintKey: `status.${key}.hint`,
  tone,
  tab,
  next,
});

/**
 * @param {any} order
 * @returns {OrderStatusInfo}
 */
export function orderStatusInfo(order) {
  const status = orderStatusKey(order);
  const refund = orderRefundStatus(order);

  if (status === "refunded" || refund === "refunded" || refund === "completed")
    return info("refunded", "success", "return-refund", "details");
  if (refund === "rejected") return info("refundRejected", "danger", "return-refund", "refund");
  if (refund === "approved") return info("refundApproved", "info", "return-refund", "refund");
  if (refund === "requested" || refund === "pending_admin_approval" || LEGACY_REFUND_STATUSES.includes(status))
    return info("refundRequested", "warn", "return-refund", "refund");

  if (status === "cancelled") return info("cancelled", "muted", "to-pay", "details");
  if (status === "out_of_stock") return info("outOfStock", "muted", "to-pay", "details");
  if (PAYMENT_STATUSES.includes(status)) {
    return String(order?.payment_status || "").toLowerCase() === "failed"
      ? info("paymentFailed", "danger", "to-pay", "pay")
      : info("awaitingPayment", "warn", "to-pay", "pay");
  }
  if (status === "paid") return info("paid", "info", "to-ship", "track");
  if (PREPARING_STATUSES.includes(status)) return info("preparing", "info", "to-ship", "track");
  if (TRANSIT_STATUSES.includes(status)) return info("onTheWay", "info", "to-receive", "track");
  // Delivered by the farmer but not yet confirmed by the buyer: still the
  // buyer's move, so it lives under "To Receive" with a confirm action.
  if (status === "delivered") return info("delivered", "action", "to-receive", "confirm");
  if (COMPLETED_STATUSES.includes(status)) return info("completed", "success", "completed", "receipt");
  return info("unknown", "muted", "to-pay", "details");
}

/** Chip colours per tone. Hex values on purpose: the global stylesheet remaps
 * Tailwind's named red/amber/gray utilities to the brand palette. */
export const TONE_CLASSES = {
  warn: "bg-[#FDF0D5] text-[#7A4B00] border-[#E9B949]",
  info: "bg-[#F7EDE2] text-[#41362D] border-[#E3C19F]",
  action: "bg-[#FFF4E0] text-[#7A4B00] border-[#E9B949]",
  success: "bg-[#E3F4E8] text-[#1E5A32] border-[#9ED3AE]",
  muted: "bg-[#EDE6DF] text-[#5A493C] border-[#CDBFB2]",
  danger: "bg-[#FBE4E1] text-[#8A1C12] border-[#E8A39A]",
};

/**
 * Progress steps shown on the order detail timeline.
 * @type {Array<{ key: string, statuses: string[] }>}
 */
export const PROGRESS_STEPS = [
  { key: "placed", statuses: ["pending_payment"] },
  { key: "paid", statuses: ["paid"] },
  { key: "preparing", statuses: ["preparing"] },
  { key: "onTheWay", statuses: ["in_transit"] },
  { key: "delivered", statuses: ["delivered"] },
  { key: "received", statuses: ["received", "completed"] },
];

/** @param {any} order index of the step the order has reached (-1 = none) */
export function progressIndex(order) {
  const status = orderStatusKey(order);
  const map = {
    pending: 0, pending_payment: 0, to_pay: 0,
    paid: 1,
    preparing: 2, to_ship: 2, processing: 2,
    in_transit: 3, shipped: 3, to_receive: 3, delivering: 3,
    delivered: 4,
    received: 5, completed: 5,
  };
  if (status in map) return map[status];
  // Refund / cancelled orders: fall back to the furthest tracking event.
  const events = Array.isArray(order?.tracking_events) ? order.tracking_events : [];
  return events.reduce((max, event) => {
    const value = map[String(event?.status || "").toLowerCase()];
    return value > max ? value : max;
  }, -1);
}
