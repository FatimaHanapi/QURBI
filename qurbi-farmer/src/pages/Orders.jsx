import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { qurbi } from "@/api/qurbiClient";
import {
  Check,
  ChevronRight,
  ImageOff,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/agri/StatusBadge";
import EmptyState from "@/components/agri/EmptyState";
import { formatMYR } from "@/lib/agri";
import { cn } from "@/lib/utils";
import { reconcileOrderLivestockStatuses } from "@/lib/orderLivestockStatus";

const FILTERS = [
  { key: "all", label: "All", statuses: null },
  { key: "to-ship", label: "To Ship", statuses: ["paid", "to_ship"] },
  { key: "shipping", label: "Shipping", statuses: ["processing"] },
  { key: "awaiting", label: "Awaiting Buyer", statuses: ["shipped", "to_receive", "delivering"] },
  { key: "completed", label: "Completed", statuses: ["completed", "delivered"] },
  { key: "issues", label: "Return / Refund", statuses: ["return_requested", "refund_requested", "return_refund", "refunded"] },
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
};

function statusMeta(status) {
  return STATUS_META[status] || [status?.replaceAll("_", " ") || "Unknown", "muted"];
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
          <Skeleton className="mt-4 h-11 w-full rounded-2xl" />
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
          alt={`${item.species || "Livestock"} ${item.breed || ""}`.trim()}
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
  const [label, tone] = statusMeta(order.status);
  const first = order.items?.[0];
  const evidenceCount = ["before", "during", "after"].filter((stage) => order.tracking_photos?.[stage]?.image_url).length;
  const canProcess = ["paid", "to_ship", "processing"].includes(order.status) && order.tracking_enabled !== false;
  const actionLabel = ["paid", "to_ship"].includes(order.status)
    ? "Start delivery"
    : order.status === "processing"
      ? "Continue delivery"
      : "View order";

  return (
    <article className="soft-card group mx-auto w-full max-w-lg min-w-0 p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(65,54,45,0.1)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs font-extrabold text-primary">#{orderNumber(order)}</p>
        <StatusBadge tone={tone} dot className="shrink-0">{label}</StatusBadge>
      </div>

      <div className="mt-3 flex min-w-0 items-center gap-3">
        <OrderItemImage item={first} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted-foreground">{first?.species || "Livestock"}</p>
          <div className="mt-0.5 flex min-w-0 items-start justify-between gap-2">
            <h2 className="min-w-0 truncate text-base font-extrabold leading-tight text-primary">{first?.breed || "Unspecified breed"}{order.items?.length > 1 ? ` +${order.items.length - 1} more` : ""}</h2>
            <p className="shrink-0 text-xs font-extrabold text-foreground sm:text-sm">{formatMYR(order.farmer_total)}</p>
          </div>
          <p className="mt-1.5 truncate text-xs text-muted-foreground">Buyer: <span className="font-semibold text-foreground">{order.buyer_name || "Buyer"}</span></p>
        </div>
      </div>

      {order.multi_farmer_order && (
        <div className="mt-4 flex gap-2 border-l-2 border-amber-500 pl-3 text-xs leading-relaxed text-amber-800">
          <ShieldAlert className="h-4 w-4 shrink-0" />Tracking is locked because this order contains packages from multiple farmers.
        </div>
      )}

      <EvidenceProgress count={evidenceCount} />

      <Button onClick={() => onOpen(order.id)} className="mt-3 h-11 w-full rounded-2xl text-sm font-bold">
        {canProcess ? <Truck className="mr-2 h-4 w-4" /> : null}{actionLabel}<ChevronRight className="ml-auto h-4 w-4" />
      </Button>
    </article>
  );
}

function EvidenceProgress({ count }) {
  const stages = ["Before", "During", "After"];

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold text-muted-foreground">Delivery evidence</p>
        <p className="text-[10px] font-semibold text-muted-foreground">{count}/3</p>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {stages.map((stage, index) => {
          const complete = index < count;
          return (
            <div key={stage} className="min-w-0">
              <div className={cn("flex h-1.5 overflow-hidden rounded-full", complete ? "bg-primary" : "bg-muted")} />
              <p className={cn("mt-1.5 flex items-center gap-1 text-[10px] font-semibold", complete ? "text-primary" : "text-muted-foreground")}>
                {complete && <Check className="h-3 w-3" />}{stage}
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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await qurbi.functions.invoke("fetchFarmerOrders", {});
      const packages = response.data?.orders;
      if (!Array.isArray(packages)) throw new Error("The order service returned an invalid response.");
      const livestock = await qurbi.entities.Livestock.list("-created_date", 500);
      await reconcileOrderLivestockStatuses(packages, livestock);
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
  const filtered = useMemo(
    () => active.statuses ? orders.filter((order) => active.statuses.includes(order.status)) : orders,
    [active, orders],
  );

  return (
    <div className="mx-auto w-full max-w-6xl animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Order fulfilment</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight lg:text-3xl">Orders</h1><p className="mt-1 text-sm text-muted-foreground">Manage active deliveries.</p></div>
        <Button variant="outline" onClick={load} disabled={loading} className="h-11 shrink-0 rounded-2xl px-3 sm:px-4"><RefreshCw className={cn("h-4 w-4 sm:mr-2", loading && "animate-spin")} /><span className="hidden sm:inline">Refresh</span></Button>
      </div>

      <div className="-mx-4 mt-6 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
        <div className="flex min-w-max gap-2 rounded-2xl lg:w-fit lg:bg-muted/45 lg:p-1.5">
          {FILTERS.map((item) => {
            const count = item.statuses ? orders.filter((order) => item.statuses.includes(order.status)).length : orders.length;
            return <button key={item.key} onClick={() => setFilter(item.key)} className={cn("flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-all", filter === item.key ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground lg:bg-transparent")}>{item.label}<span className={cn("flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px]", filter === item.key ? "bg-white/20" : "bg-background/80")}>{count}</span></button>;
          })}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
          <div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /><div><p className="text-sm font-bold text-destructive">Order service unavailable</p><p className="mt-1 text-xs text-muted-foreground">{error}</p></div></div>
          <Button variant="outline" onClick={load} className="mt-4 w-full">Try again</Button>
        </div>
      )}

      {loading ? <LoadingCards /> : !error && filtered.length ? (
        <div className="mt-4 grid min-w-0 justify-items-center gap-4 xl:grid-cols-2">{filtered.map((order) => <PackageCard key={order.id} order={order} onOpen={(id) => navigate(`/orders/${id}`)} />)}</div>
      ) : !error ? (
        <div className="mt-4"><EmptyState icon={PackageCheck} title="No orders found" description={filter === "all" ? "Paid orders assigned to your livestock will appear here." : `No orders are currently in ${active.label}.`} /></div>
      ) : null}
    </div>
  );
}
