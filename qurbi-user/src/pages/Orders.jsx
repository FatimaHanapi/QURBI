import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  LayoutGrid,
  List,
  Package,
  ReceiptText,
  Check,
  Trash2,
} from "lucide-react";
import { qurbiApi } from "@/api/qurbiClient";
import { useAuth } from "@/lib/AuthContext";
import { useAuthPrompt } from "@/lib/auth-prompt-context";
import { useReveal } from "@/hooks/useReveal";
import CancelOrderModal from "@/components/CancelOrderModal";
import AppHeader from "@/components/AppHeader";
import {
  formatOrderDate,
  formatOrderTime,
  orderDateKey,
  orderDayHeading,
  orderTimestamp,
} from "@/lib/order-date";
import PageLoading from "@/components/PageLoading";

const TABS = [
  {
    key: "to-pay",
    label: "To Pay",
    statuses: ["pending", "pending_payment", "to_pay", "cancelled", "out_of_stock"],
  },
  {
    key: "to-ship",
    label: "To Ship",
    statuses: ["paid", "preparing", "to_ship", "processing"],
  },
  {
    key: "to-receive",
    label: "To Receive",
    statuses: ["in_transit", "shipped", "to_receive", "delivering"],
  },
  {
    key: "completed",
    label: "Completed",
    statuses: ["completed", "delivered", "received"],
  },
  {
    key: "return-refund",
    label: "Return / Refunded",
    statuses: [
      "return_requested",
      "refund_requested",
      "return_refund",
      "refunded",
    ],
  },
];

const STATUS_LABELS = {
  pending: "To Pay",
  pending_payment: "To Pay",
  to_pay: "To Pay",
  paid: "To Ship",
  preparing: "To Ship",
  to_ship: "To Ship",
  processing: "To Ship",
  in_transit: "To Receive",
  shipped: "To Receive",
  to_receive: "To Receive",
  delivering: "To Receive",
  completed: "Completed",
  delivered: "Completed",
  received: "Completed",
  return_requested: "Return Requested",
  refund_requested: "Refund Requested",
  return_refund: "Return / Refund",
  refunded: "Refund Complete",
  cancelled: "Cancelled",
  out_of_stock: "Out of Stock",
};

function groupOrdersByDay(orders) {
  const sorted = [...orders].sort(
    (a, b) => orderTimestamp(b.created_date) - orderTimestamp(a.created_date),
  );
  return sorted.reduce((groups, order) => {
    const key = orderDateKey(order.created_date);
    const group = groups.find((item) => item.key === key);
    if (group) group.orders.push(order);
    else
      groups.push({
        key,
        label: orderDayHeading(order.created_date),
        orders: [order],
      });
    return groups;
  }, []);
}

function OrderCard({
  order,
  view,
  onCancel,
  cancelling,
  selecting,
  selected,
  onSelect,
  fromTab = "",
}) {
  const totalItems =
    order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const isPending = ["pending", "pending_payment", "to_pay"].includes(order.status);
  const isHistory = ["cancelled", "out_of_stock"].includes(order.status);
  const originTab =
    fromTab || sessionStorage.getItem("gh_orders_active_tab") || "";
  const detailsPath = `/orders/${encodeURIComponent(order.id)}${originTab ? `?fromTab=${encodeURIComponent(originTab)}` : ""}`;
  const compact = view === "list";

  if (compact) {
    const item = order.items?.[0] || {};
    return (
      <div
        onClick={() => selecting && isHistory && onSelect(order.id)}
        className={`qurbi-dark-surface flex min-w-0 flex-col gap-2 overflow-hidden rounded-xl border px-2.5 py-2 shadow-sm sm:flex-row sm:items-center sm:gap-2.5 ${isHistory ? "border-orange-100" : "border-gray-50"}`}
      >
        <div className="flex min-w-0 w-full flex-1 items-center gap-2.5">
          {selecting && isHistory && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onSelect(order.id);
              }}
              aria-label={selected ? "Deselect order" : "Select order"}
              aria-pressed={selected}
              className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 ${selected ? "border-[#14532D] bg-gradient-to-br from-[#22C55E] to-[#15803D] shadow-sm" : "border-gray-300"}`}
            >
              {selected && (
                <Check
                  className="h-3.5 w-3.5 text-[#FFFFFF]"
                  strokeWidth={3}
                  style={{ color: "#FFFFFF", stroke: "#FFFFFF" }}
                />
              )}
            </button>
          )}
          <Link
            to={
              isPending
                ? `/payment?order_id=${encodeURIComponent(order.id)}`
                : detailsPath
            }
            onClick={(event) => {
              if (selecting && isHistory) event.preventDefault();
            }}
            className="flex min-w-0 flex-1 items-center gap-2.5"
            aria-label={`View order ${order.order_number}`}
          >
            <div className="flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-lg bg-[#F7EDE2] text-base">
              {item.image ? (
                <img src={item.image} alt="" className="h-full w-full object-cover" />
              ) : (
                "🐄"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="whitespace-normal break-words [overflow-wrap:anywhere] text-sm font-semibold text-gray-800">
                {item.breed || item.listing_name || "Order items"}
              </p>
              <p className="truncate text-[11px] text-gray-400">
                {formatOrderDate(order.created_date, {
                  month: "short",
                  year: undefined,
                })}{" "}
                ·{" "}
                <span className="background-grey font-bold text-white">
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </p>
            </div>
            <p className="flex-none whitespace-nowrap text-xs font-bold text-gray-900">
              RM {order.total?.toLocaleString()}
            </p>
          </Link>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {isPending && (
            <button
              onClick={() => onCancel(order)}
              disabled={cancelling}
              className="rounded-lg border border-[#41362D] bg-gradient-to-br from-[#EF4444] to-[#B91C1C] px-2 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-red-950/25 disabled:opacity-50"
            >
              {cancelling ? "..." : "Cancel"}
            </button>
          )}
          {isPending ? (
            <Link
              to={`/payment?order_id=${encodeURIComponent(order.id)}`}
              className="whitespace-nowrap rounded-lg bg-[#F7EDE2]0 px-2 py-1.5 text-[11px] font-bold text-white"
            >
              Complete Payment
            </Link>
          ) : (
            <Link to={detailsPath} className="text-[#5A493C]">
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => selecting && isHistory && onSelect(order.id)}
      className={`qurbi-dark-surface shadow-sm border ${isHistory ? "border-orange-100" : "border-gray-50"} ${compact ? "rounded-xl px-3 py-2.5" : "rounded-2xl p-4"}`}
    >
      {selecting && isHistory && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onSelect(order.id);
          }}
          aria-pressed={selected}
          className="mb-3 flex items-center gap-2 rounded-xl border border-[#41362D]/60 bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] px-3 py-2 text-xs font-semibold text-[#41362D] shadow-sm transition-transform active:scale-[0.98]"
        >
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-md border-2 ${selected ? "border-[#14532D] bg-gradient-to-br from-[#22C55E] to-[#15803D] shadow-sm" : "border-gray-300"}`}
          >
            {selected && (
              <Check
                className="h-3.5 w-3.5 text-[#FFFFFF]"
                strokeWidth={3}
                style={{ color: "#FFFFFF", stroke: "#FFFFFF" }}
              />
            )}
          </span>
          Select order
        </button>
      )}
      <Link
        to={
          isPending
            ? `/payment?order_id=${encodeURIComponent(order.id)}`
            : detailsPath
        }
        onClick={(event) => {
          if (selecting && isHistory) event.preventDefault();
        }}
        className="block"
        aria-label={`View order ${order.order_number}`}
      >
        <div
          className={`flex items-start justify-between gap-3 ${compact ? "" : "border-b border-gray-50 pb-3"}`}
        >
          <div className="min-w-0">
            <p className="break-words whitespace-normal [overflow-wrap:anywhere] font-bold text-gray-900">
              {order.order_number}
            </p>
            {!compact && (
              <p className="text-gray-400 text-xs mt-0.5">
                {formatOrderTime(order.created_date)}
              </p>
            )}
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[15px] font-bold whitespace-nowrap ${
              order.refund_status?.toLowerCase() == "rejected"
                ? "bg-red-50 text-red-700"
                : [
                      "to_pay",
                      "paid",
                      "completed",
                      "delivered",
                      "refunded",
                    ].includes(order.status?.toLowerCase())
                  ? "bg-[#F7EDE2] text-[#41362D]"
                  : [
                        "pending",
                        "to_ship",
                        "processing",
                        "to_received",
                        "delivering",
                        "return_requested",
                        "refund_requested",
                        "to_receive",
                      ].includes(order.status?.toLowerCase())
                    ? "bg-yellow-50 text-yellow-700"
                    : "bg-red-50 text-red-700"
            }`}
          >
            {order.refund_status?.toLowerCase() === "rejected"
              ? "Rejected"
              : STATUS_LABELS[order.status] || order.status}
          </span>
        </div>
        <div
          className={`flex items-center justify-between gap-3 ${compact ? "pt-1" : "py-3"}`}
        >
          <div className="min-w-0">
            <p className="break-words whitespace-normal [overflow-wrap:anywhere] text-sm font-semibold text-gray-800">
              {order.items?.[0]?.breed || order.items?.[0]?.listing_name || "Order items"}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">
              {totalItems} head · {order.items?.length || 0} item
              {order.items?.length === 1 ? "" : "s"}
            </p>
          </div>
          <p className="text-gray-900 text-sm font-bold whitespace-nowrap">
            RM {order.total?.toLocaleString()}
          </p>
        </div>
      </Link>
      <div
        className={`flex flex-wrap items-center justify-end gap-2 ${compact ? "pt-2" : "pt-2 border-t border-gray-50"}`}
      >
        {isPending && (
          <button
            onClick={() => onCancel(order)}
            disabled={cancelling}
            className="rounded-lg border border-[#41362D] bg-gradient-to-br from-[#EF4444] to-[#B91C1C] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-red-950/25 disabled:opacity-50"
          >
            {cancelling ? "Cancelling..." : "Cancel Order"}
          </button>
        )}
        <Link
          to={
            isPending
              ? `/payment?order_id=${encodeURIComponent(order.id)}`
              : detailsPath
          }
          className="flex items-center gap-1 text-[#5A493C] text-xs font-semibold"
        >
          {isPending ? "Complete Payment" : "View order"}{" "}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

function DeleteHistoryModal({ count, loading, onClose, onConfirm }) {
  if (!count) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={() => !loading && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900">
          Delete selected orders?
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          {count} order{count === 1 ? "" : "s"} will be removed from your order
          history.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="min-h-11 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 disabled:opacity-50"
          >
            Keep Orders
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="min-h-11 rounded-xl bg-red-500 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const { requestSignIn } = useAuthPrompt();
  const { user, isAuthenticated, authChecked } = useAuth();
  const navigate = useNavigate();
  const { reveal } = useReveal();
  const [activeTab, setActiveTab] = useState(() => {
    const queryTab = new URLSearchParams(window.location.search).get("tab");
    const savedTab = sessionStorage.getItem("gh_orders_active_tab");
    if (TABS.some((tab) => tab.key === queryTab)) return queryTab;
    return TABS.some((tab) => tab.key === savedTab) ? savedTab : "to-pay";
  });
  const [view, setView] = useState(
    () => sessionStorage.getItem("gh_orders_view") || "current",
  );
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState("");
  const [cancelCandidate, setCancelCandidate] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [selectingHistory, setSelectingHistory] = useState(false);
  const [historyIds, setHistoryIds] = useState([]);
  const [deletingHistory, setDeletingHistory] = useState(false);
  const [showDeleteHistory, setShowDeleteHistory] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!authChecked) return;
    if (!isAuthenticated || !user?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await qurbiApi.functions.invoke("fetchMyOrders", {});
      setOrders(response.data?.orders || []);
    } catch {
      setError("We couldn't load your orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [authChecked, isAuthenticated, user?.id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);
  useEffect(() => {
    const queryTab = new URLSearchParams(window.location.search).get("tab");
    if (TABS.some((tab) => tab.key === queryTab))
      navigate("/orders", { replace: true });
  }, [navigate]);
  useEffect(() => {
    sessionStorage.setItem("gh_orders_active_tab", activeTab);
  }, [activeTab]);
  useEffect(() => {
    sessionStorage.setItem("gh_orders_view", view);
  }, [view]);

  const cancelOrder = async () => {
    const orderId = cancelCandidate?.id;
    if (!orderId || cancellingOrderId) return;
    setCancellingOrderId(orderId);
    setCancelError("");
    try {
      const response = await qurbiApi.functions.invoke("cancelMyOrder", {
        orderId,
      });
      const cancelledOrder = response.data?.order;
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? { ...order, ...cancelledOrder, status: "cancelled" }
            : order,
        ),
      );
      setCancelCandidate(null);
      setSuccessMessage("Order cancelled successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);
      await loadOrders();
    } catch (error) {
      setCancelError(
        error.data?.error ||
          error.message ||
          "We couldn't cancel this order. Please try again.",
      );
      // The server may have detected a stock change while cancellation was open.
      await loadOrders();
    } finally {
      setCancellingOrderId("");
    }
  };
  const toggleHistory = (id) =>
    setHistoryIds((ids) =>
      ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
    );
  const deleteHistory = async () => {
    if (!historyIds.length || deletingHistory) return;
    setDeletingHistory(true);
    try {
      await qurbiApi.functions.invoke("hideMyOrderHistory", {
        orderIds: historyIds,
      });
      setOrders((current) =>
        current.filter((order) => !historyIds.includes(order.id)),
      );
      setHistoryIds([]);
      setSelectingHistory(false);
      setShowDeleteHistory(false);
    } catch (error) {
      setError(
        error.data?.error || "We couldn't remove those orders from history.",
      );
    } finally {
      setDeletingHistory(false);
    }
  };

  const active = TABS.find((tab) => tab.key === activeTab);
  const visibleOrders = useMemo(
    () => orders.filter((order) => active.statuses.includes(order.status)),
    [active, orders],
  );
  const selectableHistoryIds = useMemo(
    () =>
      visibleOrders
        .filter((order) => ["cancelled", "out_of_stock"].includes(order.status))
        .map((order) => order.id),
    [visibleOrders],
  );
  const allHistorySelected =
    selectableHistoryIds.length > 0 &&
    selectableHistoryIds.every((id) => historyIds.includes(id));
  const toggleAllHistory = () =>
    setHistoryIds(allHistorySelected ? [] : selectableHistoryIds);
  const groupedOrders = useMemo(
    () => groupOrdersByDay(visibleOrders),
    [visibleOrders],
  );

  if (!authChecked) {
    return (
      <div className="qurbi-page">
        <AppHeader title="My Orders" subtitle="Track and manage your purchases" />
        <PageLoading contentOnly message="Loading orders..." />
      </div>
    );
  }

  if (authChecked && !isAuthenticated)
    return (
      <div className="aisyah-page min-h-screen pb-28">
        <AppHeader title="My Orders" subtitle="Track and manage your purchases" />
        <div className="aisyah-content flex flex-col items-center justify-center gap-3 py-20 text-center">
          <ReceiptText className="h-12 w-12 text-[#41362D]/35" />
          <p className="text-sm text-[#41362D]/65">Sign in to view your orders.</p>
          <button
            type="button"
            onClick={() => requestSignIn({ returnTo: "/orders", message: "Sign in to view and manage your orders." })}
            className="mt-2 rounded-xl bg-gradient-to-br from-[#41362D] to-[#6B594A] px-6 py-3 text-sm font-bold text-white"
          >
            Sign In
          </button>
        </div>
      </div>
    );

  return (
    <div className="qurbi-page">
      <AppHeader
        sticky
        title="My Orders"
        subtitle="Track and manage your purchases"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex rounded-xl bg-white/10 p-1">
            <button
              onClick={() => setView("current")}
              aria-label="Current order view"
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${view === "current" ? "bg-[#E3C19F] text-[#41362D] shadow-sm" : "text-white/70"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              aria-label="List order view"
              className={`flex h-8 w-8 items-center justify-center rounded-lg border-white ${view === "list" ? "bg-[#E3C19F] text-[#41362D] shadow-sm" : "text-white/70"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <div className="horizontal-filter-scroll no-scrollbar max-w-full overflow-x-auto">
            <div className="flex min-w-max gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSelectingHistory(false);
                    setHistoryIds([]);
                  }}
                  className={`relative rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === tab.key ? "bg-[#E3C19F] text-[#41362D]" : "bg-white/10 text-white/80"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </AppHeader>
      {successMessage && (
        <div className="fixed top-5 left-4 right-4 z-40 bg-[#5A493C] text-white rounded-xl px-4 py-3 text-sm font-semibold shadow-lg">
          {successMessage}
        </div>
      )}
      <main className="qurbi-content space-y-5">
        {loading && !orders.length ? (
          <PageLoading contentOnly message="Loading orders..." />
        ) : (
          <>
            {activeTab === "to-pay" && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                setSelectingHistory(!selectingHistory);
                setHistoryIds([]);
              }}
              className={`rounded-xl border px-4 py-2 text-sm font-bold shadow-sm transition-transform active:scale-[0.98] ${selectingHistory ? "border-[#41362D] bg-gradient-to-br from-[#EF4444] to-[#B91C1C] text-white shadow-red-950/25" : "border-[#F7EDE2]/60 bg-gradient-to-br from-[#41362D] to-[#6B594A] text-white shadow-black/20"}`}
            >
              {selectingHistory ? "Cancel" : "Select"}
            </button>
          </div>
        )}
            {selectingHistory && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!selectableHistoryIds.length || deletingHistory}
              onClick={toggleAllHistory}
              aria-pressed={allHistorySelected}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#41362D]/60 bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] px-3 py-2 text-sm font-bold text-[#41362D] shadow-sm transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span
                className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 ${allHistorySelected ? "border-[#14532D] bg-gradient-to-br from-[#22C55E] to-[#15803D] shadow-sm" : "border-[#41362D]/60 bg-white"}`}
              >
                {allHistorySelected && (
                  <Check
                    className="h-3.5 w-3.5 text-[#FFFFFF]"
                    strokeWidth={3}
                    style={{ color: "#FFFFFF", stroke: "#FFFFFF" }}
                  />
                )}
              </span>
              {allHistorySelected ? "Deselect All" : "Select All"}
            </button>
            <button
              disabled={!historyIds.length || deletingHistory}
              onClick={() => setShowDeleteHistory(true)}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-400 to-red-600 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {deletingHistory
                ? "Deleting..."
                : `Delete (${historyIds.length})`}
            </button>
          </div>
        )}
            {error ? (
          <div className="text-center py-16">
            <p className="text-gray-400">{error}</p>
            <button
              onClick={loadOrders}
              className="text-[#5A493C] text-sm font-semibold mt-3"
            >
              Retry
            </button>
          </div>
        ) : groupedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
              <Package className="w-10 h-10 text-black" />
            </div>
            <p className="text-gray-600 font-semibold">No orders to show</p>
            <p className="text-gray-400 text-sm text-center">
              Orders in {active.label.toLowerCase()} will appear here.
            </p>
          </div>
        ) : (
          groupedOrders.map((group) => (
            <section key={group.key} className="space-y-2">
              <h2 className="text-gray-500 text-xs font-bold uppercase tracking-wide px-1">
                {group.label}
              </h2>
              <div className={view === "list" ? "space-y-2" : "space-y-3"}>
                {group.orders.map((order, index) => (
                  <div
                    key={order.id}
                    className={reveal()}
                    style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}
                  >
                    <OrderCard
                      order={order}
                      view={view}
                      onCancel={(candidate) => {
                        setCancelError("");
                        setCancelCandidate(candidate);
                      }}
                      cancelling={cancellingOrderId === order.id}
                      selecting={selectingHistory}
                      selected={historyIds.includes(order.id)}
                      onSelect={toggleHistory}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))
            )}
          </>
        )}
      </main>
      <DeleteHistoryModal
        count={showDeleteHistory ? historyIds.length : 0}
        loading={deletingHistory}
        onConfirm={deleteHistory}
        onClose={() => setShowDeleteHistory(false)}
      />
      <CancelOrderModal
        order={cancelCandidate}
        loading={!!cancellingOrderId}
        error={cancelError}
        onConfirm={cancelOrder}
        onClose={() => {
          setCancelError("");
          setCancelCandidate(null);
        }}
      />
    </div>
  );
}
