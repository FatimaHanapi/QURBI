import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  LayoutGrid,
  List,
  Package,
  ReceiptText,
  Check,
  Trash2,
  Clock3,
  ShoppingBag,
} from "lucide-react";
import { qurbiApi } from "@/api/qurbiClient";
import { useAuth } from "@/lib/AuthContext";
import { useAuthPrompt } from "@/lib/auth-prompt-context";
import { useReveal } from "@/hooks/useReveal";
import CancelOrderModal from "@/components/CancelOrderModal";
import AppHeader from "@/components/AppHeader";
import { orderDateKey, orderTimestamp } from "@/lib/order-date";
import { formatRM } from "@/lib/format";
import PageLoading from "@/components/PageLoading";
import StatusChip from "@/components/account/StatusChip";
import { ORDER_TABS, orderStatusInfo } from "@/components/account/orderStatus";
import { accountMediaUrl } from "@/components/account/media";
import { dayHeading, shortDateTime } from "@/components/account/dates";
import {
  dangerBtn,
  dangerOutlineBtn,
  ghostOnDarkBtn,
  lightBtn,
  primaryBtn,
  secondaryBtn,
} from "@/components/account/buttons";

const HISTORY_STATUSES = ["cancelled", "out_of_stock"];

function reservationLabel(order, t) {
  if (!order.reservation_expires_at || order.reservation_status !== "active")
    return "";
  const expiresAt = new Date(order.reservation_expires_at);
  if (Number.isNaN(expiresAt.getTime())) return t("orders.reservation.reservedFor24h");
  const formatted = new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(expiresAt);
  return `${order.payment_status === "failed" ? t("orders.reservation.paymentFailedPrefix") : ""}${t("orders.reservation.reservedUntil", { time: formatted })}`;
}

function groupOrdersByDay(orders, ta) {
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
        label: dayHeading(order.created_date, ta),
        orders: [order],
      });
    return groups;
  }, []);
}

/** Title shown for an order: listing title of the first item (+N more). */
function orderTitle(order, t, ta) {
  const first = order.items?.[0] || {};
  const name = first.breed || first.listing_name || t("orders.fallbackItemName");
  const extra = (order.items?.length || 0) - 1;
  return extra > 0 ? ta("orders.titleMore", { name, count: extra }) : name;
}

function farmerName(order) {
  return (
    order.farmer?.fullName ||
    order.farmer_name ||
    order.items?.[0]?.farmer_name ||
    ""
  );
}

function SelectBox({ selected }) {
  return (
    <span
      className={`flex h-6 w-6 flex-none items-center justify-center rounded-md border-2 ${selected ? "border-[#E3C19F] bg-[#E3C19F]" : "border-white/70 bg-transparent"}`}
    >
      {selected && <Check className="h-4 w-4 text-[#41362D]" strokeWidth={3} />}
    </span>
  );
}

function OrderThumb({ item, size = "h-16 w-16" }) {
  const [failed, setFailed] = useState(false);
  const src = accountMediaUrl(item?.image);
  return (
    <div
      className={`flex ${size} flex-none items-center justify-center overflow-hidden rounded-xl bg-[#F7EDE2] text-[#6B594A]`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <ShoppingBag className="h-6 w-6" aria-hidden="true" />
      )}
    </div>
  );
}

function OrderCard({
  order,
  view,
  onCancel,
  cancelling,
  selecting,
  selected,
  onSelect,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation("orders");
  const { t: ta } = useTranslation("account");
  const status = orderStatusInfo(order);
  const totalItems =
    order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const isPending = status.next === "pay";
  const reservedUntil = isPending ? reservationLabel(order, t) : "";
  const isHistory = HISTORY_STATUSES.includes(order.status);
  const originTab = sessionStorage.getItem("gh_orders_active_tab") || "";
  const detailsPath = `/orders/${encodeURIComponent(order.id)}${originTab ? `?fromTab=${encodeURIComponent(originTab)}` : ""}`;
  const paymentPath = `/payment?order_id=${encodeURIComponent(order.id)}`;
  const receiptPath = `/receipt?order_id=${encodeURIComponent(order.id)}`;
  const cardDestination = isPending ? paymentPath : detailsPath;
  const title = orderTitle(order, t, ta);
  const farmer = farmerName(order);
  const selectable = selecting && isHistory;

  const primary =
    status.next === "pay"
      ? { to: paymentPath, label: t("orders.completePayment") }
      : status.next === "track"
        ? { to: detailsPath, label: ta("orders.actions.track") }
        : status.next === "confirm"
          ? { to: detailsPath, label: ta("orders.actions.confirm") }
          : status.next === "receipt"
            ? { to: receiptPath, label: ta("orders.actions.receipt") }
            : status.next === "refund"
              ? { to: detailsPath, label: ta("orders.actions.refund") }
              : { to: detailsPath, label: t("orders.viewOrderLink") };

  const handleCardClick = (event) => {
    if (selecting) {
      event.preventDefault();
      if (isHistory) onSelect(order.id);
      return;
    }
    if (event.target.closest("a, button")) return;
    navigate(cardDestination);
  };

  if (view === "list") {
    return (
      <div
        onClick={handleCardClick}
        className={`qurbi-dark-surface flex min-h-[72px] min-w-0 cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-sm ${selected ? "ring-2 ring-[#E3C19F]" : ""}`}
      >
        {selectable && <SelectBox selected={selected} />}
        <OrderThumb item={order.items?.[0]} size="h-12 w-12" />
        <div className="min-w-0 flex-1">
          <p className="break-words text-[15px] font-bold leading-snug text-white [overflow-wrap:anywhere]">
            {title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusChip order={order} />
            <span className="text-xs text-white/75">
              {shortDateTime(order.created_date, ta)}
            </span>
          </div>
        </div>
        <div className="flex flex-none flex-col items-end gap-1">
          <p className="whitespace-nowrap text-[15px] font-bold text-white">
            {formatRM(order.total)}
          </p>
          {!selecting && (
            <Link
              to={primary.to}
              aria-label={`${primary.label} · ${order.order_number}`}
              className="-mr-1 flex h-11 min-w-11 items-center justify-center gap-1 rounded-xl px-1 text-xs font-bold text-[#E3C19F]"
            >
              {isPending ? primary.label : null}
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <article
      onClick={handleCardClick}
      aria-label={t("orders.aria.viewOrder", { orderNumber: order.order_number })}
      className={`qurbi-dark-surface cursor-pointer overflow-hidden rounded-2xl border shadow-md ${selected ? "ring-2 ring-[#E3C19F]" : ""}`}
    >
      {selectable && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect(order.id);
          }}
          aria-pressed={selected}
          className="flex min-h-12 w-full items-center gap-3 border-b border-white/15 px-4 text-sm font-bold text-white"
        >
          <SelectBox selected={selected} />
          {selected ? t("orders.aria.deselectOrder") : t("orders.selectOrderLabel")}
        </button>
      )}
      <div className="flex gap-3 p-4">
        <OrderThumb item={order.items?.[0]} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 break-words text-base font-bold leading-snug text-white [overflow-wrap:anywhere]">
              {title}
            </p>
            <StatusChip order={order} className="flex-none" />
          </div>
          <p className="mt-1 text-[13px] text-white/80">
            {t("orders.headCount", { count: totalItems })} · {shortDateTime(order.created_date, ta)}
          </p>
          {farmer && (
            <p className="mt-0.5 truncate text-[13px] text-white/80">
              {ta("orders.fromFarmer", { name: farmer })}
            </p>
          )}
          <p className="mt-0.5 break-all text-xs text-white/60">
            {ta("orders.orderNumber", { number: order.order_number })}
          </p>
        </div>
      </div>

      {reservedUntil && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-xl bg-[#FDF0D5] px-3 py-2.5 text-[13px] font-semibold leading-snug text-[#7A4B00]">
          <Clock3 className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span>
            {reservedUntil}. {t("orders.reservation.retryHint")}
          </span>
        </div>
      )}

      <div className="border-t border-white/15 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="mr-auto">
            <p className="text-xs text-white/70">{ta("orders.total")}</p>
            <p className="text-lg font-bold leading-tight text-white">
              {formatRM(order.total)}
            </p>
          </div>
          {!selecting && !isPending && (
            <Link
              to={primary.to}
              onClick={(event) => event.stopPropagation()}
              className={`${lightBtn} min-h-11 px-4 text-sm`}
            >
              {primary.label}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
        {!selecting && isPending && (
          <div className="mt-3 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onCancel(order);
              }}
              disabled={cancelling}
              className={`${ghostOnDarkBtn} min-h-11 px-2 text-sm`}
            >
              {cancelling ? t("orders.cancelling") : t("orders.cancelOrder")}
            </button>
            <Link
              to={primary.to}
              onClick={(event) => event.stopPropagation()}
              className={`${lightBtn} min-h-11 px-3 text-sm`}
            >
              {primary.label}
              <ChevronRight className="h-4 w-4 flex-none" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

function DeleteHistoryModal({ count, loading, onClose, onConfirm }) {
  const { t } = useTranslation("orders");
  if (!count) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-history-title"
      onClick={() => !loading && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-[#E3C19F] bg-[#FFFDF9] p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="delete-history-title" className="text-lg font-bold text-[#41362D]">
          {t("orders.deleteModal.title")}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[#5A493C]">
          {t("orders.deleteModal.body", { count })}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={secondaryBtn}
          >
            {t("orders.deleteModal.keep")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={dangerBtn}
          >
            {loading ? t("orders.deleteModal.deleting") : t("orders.deleteModal.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const { requestSignIn } = useAuthPrompt();
  const { t } = useTranslation("orders");
  const { t: ta } = useTranslation("account");
  const { user, isAuthenticated, authChecked } = useAuth();
  const navigate = useNavigate();
  const { reveal } = useReveal();
  const [activeTab, setActiveTab] = useState(() => {
    const queryTab = new URLSearchParams(window.location.search).get("tab");
    const savedTab = sessionStorage.getItem("gh_orders_active_tab");
    if (ORDER_TABS.some((tab) => tab.key === queryTab)) return queryTab;
    return ORDER_TABS.some((tab) => tab.key === savedTab) ? savedTab : "to-pay";
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
      setError(t("orders.loadError"));
    } finally {
      setLoading(false);
    }
  }, [authChecked, isAuthenticated, user?.id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);
  useEffect(() => {
    const queryTab = new URLSearchParams(window.location.search).get("tab");
    if (ORDER_TABS.some((tab) => tab.key === queryTab))
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
      setSuccessMessage(t("orders.cancelSuccess"));
      setTimeout(() => setSuccessMessage(""), 3000);
      await loadOrders();
    } catch (error) {
      setCancelError(
        error.data?.error ||
          error.message ||
          t("orders.cancelErrorFallback"),
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
        error.data?.error || t("orders.deleteHistoryError"),
      );
    } finally {
      setDeletingHistory(false);
    }
  };

  const tabCounts = useMemo(() => {
    const counts = {};
    for (const order of orders) {
      const tab = orderStatusInfo(order).tab;
      counts[tab] = (counts[tab] || 0) + 1;
    }
    return counts;
  }, [orders]);
  const active = ORDER_TABS.find((tab) => tab.key === activeTab) || ORDER_TABS[0];
  const visibleOrders = useMemo(
    () => orders.filter((order) => orderStatusInfo(order).tab === active.key),
    [active, orders],
  );
  const selectableHistoryIds = useMemo(
    () =>
      visibleOrders
        .filter((order) => HISTORY_STATUSES.includes(order.status))
        .map((order) => order.id),
    [visibleOrders],
  );
  const allHistorySelected =
    selectableHistoryIds.length > 0 &&
    selectableHistoryIds.every((id) => historyIds.includes(id));
  const toggleAllHistory = () =>
    setHistoryIds(allHistorySelected ? [] : selectableHistoryIds);
  const groupedOrders = useMemo(
    () => groupOrdersByDay(visibleOrders, ta),
    [visibleOrders, ta],
  );

  if (!authChecked) {
    return (
      <div className="aisyah-page">
        <AppHeader title={t("orders.title")} subtitle={t("orders.subtitle")} />
        <PageLoading contentOnly message={t("orders.loadingOrders")} />
      </div>
    );
  }

  if (authChecked && !isAuthenticated)
    return (
      <div className="aisyah-page min-h-screen">
        <AppHeader title={t("orders.title")} subtitle={t("orders.subtitle")} />
        <div className="aisyah-content flex flex-col items-center justify-center gap-3 py-16 text-center">
          <ReceiptText className="h-12 w-12 text-[#41362D]/40" aria-hidden="true" />
          <h2 className="text-lg font-bold text-[#41362D]">{ta("orders.guestTitle")}</h2>
          <p className="max-w-xs text-[15px] leading-relaxed text-[#41362D]/75">{t("orders.signInPrompt")}</p>
          <button
            type="button"
            onClick={() => requestSignIn({ returnTo: "/orders", message: t("orders.signInMessage") })}
            className={`${primaryBtn} mt-2 px-8`}
          >
            {t("orders.signIn")}
          </button>
        </div>
      </div>
    );

  return (
    <div className="aisyah-page">
      <AppHeader
        sticky
        title={t("orders.title")}
        subtitle={t("orders.subtitle")}
      >
        <div className="flex w-full min-w-0 items-center gap-2">
          <div
            className="flex flex-none rounded-xl bg-white/10 p-0.5"
            role="group"
            aria-label={ta("orders.viewToggle")}
          >
            <button
              type="button"
              onClick={() => setView("current")}
              aria-label={t("orders.aria.currentView")}
              aria-pressed={view === "current"}
              className={`flex h-11 w-11 items-center justify-center rounded-lg ${view === "current" ? "bg-[#E3C19F] text-[#41362D] shadow-sm" : "text-white/80"}`}
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label={t("orders.aria.listView")}
              aria-pressed={view === "list"}
              className={`flex h-11 w-11 items-center justify-center rounded-lg ${view === "list" ? "bg-[#E3C19F] text-[#41362D] shadow-sm" : "text-white/80"}`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
          <div className="horizontal-filter-scroll no-scrollbar min-w-0 flex-1 overflow-x-auto">
            <div className="flex min-w-max gap-1.5 pr-2" role="tablist" aria-label={t("orders.title")}>
              {ORDER_TABS.map((tab) => {
                const count = tabCounts[tab.key] || 0;
                const selected = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => {
                      setActiveTab(tab.key);
                      setSelectingHistory(false);
                      setHistoryIds([]);
                    }}
                    className={`flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-bold transition-colors ${selected ? "bg-[#E3C19F] text-[#41362D]" : "bg-white/10 text-white"}`}
                  >
                    {t(tab.labelKey)}
                    {count > 0 && (
                      <span
                        className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${selected ? "bg-[#41362D] text-white" : "bg-white/20 text-white"}`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </AppHeader>
      {successMessage && (
        <div
          role="status"
          className="fixed left-4 right-4 top-5 z-40 rounded-xl bg-[#41362D] px-4 py-3 text-[15px] font-semibold text-white shadow-lg"
        >
          {successMessage}
        </div>
      )}
      <main className="aisyah-content mx-auto max-w-3xl space-y-5">
        {loading && !orders.length ? (
          <PageLoading contentOnly message={t("orders.loadingOrders")} />
        ) : (
          <>
            {activeTab === "to-pay" && selectableHistoryIds.length > 0 && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-[#41362D]/75">
                  {selectingHistory ? ta("orders.selectHint") : ta("orders.historyHint")}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectingHistory(!selectingHistory);
                    setHistoryIds([]);
                  }}
                  className={`${secondaryBtn} min-h-11 flex-none px-4 text-sm`}
                >
                  {selectingHistory ? t("orders.cancel") : t("orders.select")}
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
                  className={`${secondaryBtn} min-h-11 text-sm`}
                >
                  {allHistorySelected ? t("orders.deselectAll") : t("orders.selectAll")}
                </button>
                <button
                  type="button"
                  disabled={!historyIds.length || deletingHistory}
                  onClick={() => setShowDeleteHistory(true)}
                  className={`${dangerOutlineBtn} min-h-11 text-sm`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {deletingHistory
                    ? t("orders.deleteModal.deleting")
                    : t("orders.deleteWithCount", { count: historyIds.length })}
                </button>
              </div>
            )}
            {error ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#E3C19F] bg-[#FFFDF9] px-5 py-10 text-center">
                <p className="text-[15px] font-semibold text-[#41362D]">{error}</p>
                <button type="button" onClick={loadOrders} className={`${primaryBtn} px-8`}>
                  {t("orders.retry")}
                </button>
              </div>
            ) : groupedOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#E3C19F] bg-[#FFFDF9]/80 px-6 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F7EDE2]">
                  <Package className="h-8 w-8 text-[#6B594A]" aria-hidden="true" />
                </div>
                <p className="text-base font-bold text-[#41362D]">{t("orders.emptyTitle")}</p>
                <p className="max-w-xs text-[15px] leading-relaxed text-[#41362D]/75">
                  {ta(`orders.empty.${active.key}`)}
                </p>
                <Link to="/browse" className={`${primaryBtn} mt-1 px-6`}>
                  {ta("orders.browseLivestock")}
                </Link>
              </div>
            ) : (
              groupedOrders.map((group) => (
                <section key={group.key} className="space-y-2.5">
                  <h2 className="px-1 text-sm font-bold text-[#41362D]/75">
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
