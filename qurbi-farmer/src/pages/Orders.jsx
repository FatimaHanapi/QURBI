import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { qurbi } from "@/api/qurbiClient";
import {
  Camera,
  Check,
  ChevronRight,
  ImageOff,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
<<<<<<< HEAD
=======
  Truck,
  XCircle,
>>>>>>> upstream/main
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/agri/StatusBadge";
import EmptyState from "@/components/agri/EmptyState";
import { formatMYR, orderItemTitle, orderPhotoStage, orderStatusMeta } from "@/lib/agri";
import { cn } from "@/lib/utils";
import { reconcileOrderLivestockStatuses } from "@/lib/orderLivestockStatus";

const FILTERS = [
<<<<<<< HEAD
  { key: "all", label: "All", groups: null },
  { key: "action", label: "To do", groups: ["action"] },
  { key: "payment", label: "Awaiting payment", groups: ["payment"] },
  { key: "done", label: "Delivered", groups: ["buyer", "done"] },
  { key: "issue", label: "Return / refund", groups: ["issue"] },
  { key: "closed", label: "Cancelled", groups: ["closed", "other"] },
];

const STAGE_ACTION = {
  before: "Upload before-delivery photo",
  during: "Upload during-delivery photo",
  after: "Upload arrival photo",
=======
  { key: "all", label: "All", statuses: null },
  { key: "to-ship", label: "To Ship", statuses: ["paid", "to_ship"] },
  { key: "shipping", label: "Shipping", statuses: ["processing"] },
  { key: "awaiting", label: "Awaiting Buyer", statuses: ["shipped", "to_receive", "delivering"] },
  { key: "completed", label: "Completed", statuses: ["completed", "delivered"] },
  { key: "issues", label: "Return / Refund", statuses: ["return_requested", "refund_requested", "return_refund", "refunded"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];

const STATUS_META = {
  paid: ["To Ship", "info"],
  to_ship: ["To Ship", "info"],
  processing: ["Shipping", "primary"],
  shipped: ["Awaiting Buyer", "warning"],
  to_receive: ["Awaiting Buyer", "warning"],
  delivering: ["Awaiting Buyer", "warning"],
  completed: ["Completed", "success"],
  delivered: ["Completed", "success"],
  return_requested: ["Return Requested", "danger"],
  refund_requested: ["Refund Requested", "danger"],
  return_refund: ["Return / Refund", "danger"],
  refunded: ["Refunded", "muted"],
  cancelled: ["Cancelled", "muted"],
>>>>>>> upstream/main
};

function inFilter(filter, order) {
  return !filter.groups || filter.groups.includes(orderStatusMeta(order.status).group);
}

function orderNumber(order) {
  return order.order_number || order.id?.slice(-6).toUpperCase() || "Order";
}

function LoadingCards() {
  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="soft-card p-4 sm:p-5">
          <div className="flex justify-between gap-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-7 w-20 rounded-full" /></div>
          <div className="mt-4 flex gap-3"><Skeleton className="h-16 w-16 rounded-xl" /><div className="flex-1 space-y-2 pt-1"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-3/4" /></div></div>
          <Skeleton className="mt-5 h-8 w-full rounded-xl" />
          <Skeleton className="mt-4 h-12 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

function OrderItemImage({ item }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = item?.image_url;

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
      {imageUrl && !failed ? (
        <img
          src={imageUrl}
          alt={orderItemTitle(item).title}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <ImageOff className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  );
}

function PackageCard({ order, onOpen }) {
  const meta = orderStatusMeta(order.status);
  const first = order.items?.[0];
  const { title, breed } = orderItemTitle(first);
  const evidenceCount = ["before", "during", "after"].filter((stage) => order.tracking_photos?.[stage]?.image_url).length;
<<<<<<< HEAD
  const stage = order.tracking_enabled !== false ? orderPhotoStage(order.status) : "";
  const needsFarmer = Boolean(stage);
=======
  const canProcess = ["paid", "to_ship", "processing"].includes(order.status) && order.tracking_enabled !== false;
  const isCancelled = order.status === "cancelled";
  const actionLabel = ["paid", "to_ship"].includes(order.status)
    ? "Start delivery"
    : order.status === "processing"
      ? "Continue delivery"
      : isCancelled
        ? "View cancellation"
        : "View order";
>>>>>>> upstream/main

  return (
    <article className={cn(
      "soft-card group mx-auto w-full max-w-lg min-w-0 p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(65,54,45,0.1)] sm:p-5",
      needsFarmer && "border-amber-300/80"
    )}>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="min-w-0 truncate whitespace-nowrap text-sm font-bold text-muted-foreground">#{orderNumber(order)}</p>
        <StatusBadge kind="order" status={order.status} dot className="shrink-0" />
      </div>

      <div className="mt-3 flex min-w-0 items-center gap-3">
        <OrderItemImage item={first} />
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-base font-extrabold leading-snug text-primary">{title}{order.items?.length > 1 ? ` +${order.items.length - 1} more` : ""}</h2>
          {breed && <p className="truncate text-sm text-muted-foreground">{breed}</p>}
          <div className="mt-1 flex min-w-0 items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm text-muted-foreground">Buyer: <span className="font-semibold text-foreground">{order.buyer_name || "Buyer"}</span></p>
            <p className="shrink-0 text-base font-extrabold text-foreground">{formatMYR(order.farmer_total)}</p>
          </div>
        </div>
      </div>

      {order.multi_farmer_order && (
        <div className="mt-4 flex gap-2 border-l-2 border-amber-500 pl-3 text-sm leading-relaxed text-amber-800">
          <ShieldAlert className="h-4 w-4 shrink-0" />Tracking is locked because this order contains packages from multiple farmers.
        </div>
      )}

<<<<<<< HEAD
      {meta.next && (
        <p className={cn("mt-3 rounded-xl px-3 py-2.5 text-sm leading-snug", needsFarmer ? "bg-amber-50 font-semibold text-amber-900" : "bg-muted/60 text-muted-foreground")}>
          {needsFarmer ? "Next: " : ""}{meta.next}
        </p>
      )}

      <EvidenceProgress count={evidenceCount} />
=======
      {isCancelled ? (
        <div className="mt-4 flex gap-2 rounded-xl border border-border bg-muted/45 p-3 text-xs text-muted-foreground">
          <XCircle className="h-4 w-4 shrink-0 text-foreground" />
          <div className="min-w-0"><p className="font-bold text-foreground">Cancelled by {order.cancelled_by || "Buyer"}</p><p className="mt-0.5 line-clamp-2">{order.cancellation_reason || "No cancellation reason was provided."}</p></div>
        </div>
      ) : <EvidenceProgress count={evidenceCount} />}
>>>>>>> upstream/main

      <Button onClick={() => onOpen(order.id)} variant={needsFarmer ? "default" : "outline"} className="mt-4 h-12 w-full rounded-2xl text-sm font-bold">
        {needsFarmer ? <Camera className="mr-2 h-4 w-4" /> : null}{needsFarmer ? STAGE_ACTION[stage] : "View order"}<ChevronRight className="ml-auto h-4 w-4" />
      </Button>
    </article>
  );
}

function EvidenceProgress({ count }) {
  const stages = ["Before", "During", "Arrival"];

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted-foreground">Delivery photos</p>
        <p className="text-sm font-semibold text-muted-foreground">{count} of 3</p>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {stages.map((stage, index) => {
          const complete = index < count;
          return (
            <div key={stage} className="min-w-0">
              <div className={cn("flex h-1.5 overflow-hidden rounded-full", complete ? "bg-primary" : "bg-muted")} />
              <p className={cn("mt-1.5 flex items-center gap-1 text-xs font-semibold", complete ? "text-primary" : "text-muted-foreground")}>
                {complete && <Check className="h-3.5 w-3.5" />}{stage}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Orders() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requested = searchParams.get("filter");
  const filter = FILTERS.some((item) => item.key === requested) ? requested : "all";
  const setFilter = (key) => setSearchParams(key === "all" ? {} : { filter: key }, { replace: true });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await qurbi.functions.invoke("fetchFarmerOrders", {});
      const packages = response.data?.orders;
      if (!Array.isArray(packages)) throw new Error("The order service returned an invalid response.");
      const livestock = await qurbi.entities.Livestock.list("-created_date", 500);
      // Best-effort status sync; never block the order list on it.
      await reconcileOrderLivestockStatuses(packages, livestock).catch((syncError) => console.warn("Livestock status sync skipped:", syncError?.message));
      setOrders(packages);
    } catch (loadError) {
      setOrders([]);
      setError(loadError?.response?.data?.error || loadError?.message || "Orders could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = FILTERS.find((item) => item.key === filter) || FILTERS[0];
  const filtered = useMemo(() => orders.filter((order) => inFilter(active, order)), [active, orders]);
  // Always show All / To do / Delivered; other tabs only when they have orders (or are selected).
  const visibleFilters = FILTERS.filter((item) => ["all", "action", "done"].includes(item.key) || item.key === filter || orders.some((order) => inFilter(item, order)));

  return (
    <div className="mx-auto w-full max-w-6xl animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight lg:text-3xl">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">See what each buyer is waiting for and upload delivery photos.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading} aria-label="Refresh orders" className="h-11 w-11 shrink-0 rounded-2xl px-0 sm:w-auto sm:px-4"><RefreshCw className={cn("h-4 w-4 sm:mr-2", loading && "animate-spin")} /><span className="hidden sm:inline">Refresh</span></Button>
      </div>

      <div className="no-scrollbar -mx-5 mt-5 overflow-x-auto px-5 pb-2 lg:mx-0 lg:px-0" role="tablist" aria-label="Filter orders">
        <div className="flex w-max gap-2 rounded-2xl lg:bg-muted/45 lg:p-1.5">
          {visibleFilters.map((item) => {
            const count = orders.filter((order) => inFilter(item, order)).length;
            const selected = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFilter(item.key)}
                className={cn(
                  "flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-bold transition-all",
                  selected ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground ring-1 ring-border/70 hover:text-foreground lg:bg-transparent lg:ring-0"
                )}
              >
                {item.label}
                <span className={cn("flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs", selected ? "bg-white/20" : item.key === "action" && count ? "bg-amber-100 text-amber-800" : "bg-muted")}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
          <div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /><div><p className="text-sm font-bold text-destructive">We couldn&apos;t load your orders</p><p className="mt-1 text-sm text-muted-foreground">{error}</p></div></div>
          <Button variant="outline" onClick={load} className="mt-4 h-11 w-full">Try again</Button>
        </div>
      )}

      {loading ? <LoadingCards /> : !error && filtered.length ? (
        <div className="mt-4 grid min-w-0 justify-items-center gap-4 xl:grid-cols-2">{filtered.map((order) => <PackageCard key={order.id} order={order} onOpen={(id) => navigate(`/orders/${id}`)} />)}</div>
      ) : !error ? (
        <div className="mt-4">
          <EmptyState
            icon={PackageCheck}
            title={filter === "action" ? "Nothing to do right now" : "No orders here"}
            description={filter === "all" ? "When a buyer orders one of your animals, it will appear here." : filter === "action" ? "You're all caught up. New paid orders will show up here." : `No orders are in "${active.label}" right now.`}
            action={filter !== "all" ? <Button variant="outline" onClick={() => setFilter("all")} className="h-11 rounded-2xl">Show all orders</Button> : undefined}
          />
        </div>
      ) : null}
    </div>
  );
}
