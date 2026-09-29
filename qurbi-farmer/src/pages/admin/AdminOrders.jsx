import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { qurbi } from "@/api/qurbiClient";
import StatusBadge from "@/components/agri/StatusBadge";
import EmptyState from "@/components/agri/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, ArrowRight, Check, Loader2, MapPin, Phone, RefreshCw, RotateCcw, ShieldAlert, ShoppingBag, Truck, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminPageHeader, FilterChips, ListSkeleton, ResultCount, SearchField } from "@/components/admin/AdminUi";
import { formatDateTime, formatPrice, isPendingRefund, isReviewedRefund, orderStatusInfo } from "@/components/admin/adminFormat";

const FILTERS = [
  { value: "refunds", label: "Refund requests", attention: true },
  { value: "all", label: "All orders" },
  { value: "reviewed", label: "Reviewed refunds" },
];

function orderTotal(order) {
  return Number(order.total ?? (order.items || []).reduce((sum, item) => sum + Number(item.total || 0), 0));
}

function buyerOf(order) {
  const name = order.buyer?.fullName || (order.buyer_name && order.buyer_name !== "Buyer" ? order.buyer_name : "") || order.deliveryAddress?.recipientName || "Buyer";
  return { name, email: order.buyer_email || order.buyer?.email || "", phone: order.buyer_phone || order.deliveryAddress?.recipientPhone || "" };
}

function itemTitle(item) {
  if (item.titleSnapshot) return item.titleSnapshot;
  if (item.animal) return `${item.animal} · ${item.breed || "Unspecified"}`;
  return [item.species, item.breed].filter(Boolean).join(" · ") || "Livestock";
}

export default function AdminOrders() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [review, setReview] = useState(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const filterParam = searchParams.get("filter");

  const load = () => {
    setLoading(true);
    setError("");
    qurbi.functions.invoke("fetchAdminBuyerOrders")
      .then((response) => setOrders(response.data?.orders || []))
      .catch((loadError) => setError(loadError.response?.data?.error || loadError.message || "Orders could not be loaded"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const pendingCount = orders.filter(isPendingRefund).length;
  const reviewedCount = orders.filter(isReviewedRefund).length;
  // Default to what needs action; fall back to all orders when nothing is waiting.
  const filter = FILTERS.some((item) => item.value === filterParam) ? filterParam : (loading || pendingCount > 0 ? "refunds" : "all");
  const setFilter = (value) => setSearchParams({ filter: value }, { replace: true });

  const shownOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = filter === "refunds" ? orders.filter(isPendingRefund) : filter === "reviewed" ? orders.filter(isReviewedRefund) : orders;
    if (!term) return base;
    return base.filter((order) => {
      const buyer = buyerOf(order);
      return `${order.order_number || order.id} ${buyer.name} ${buyer.email}`.toLowerCase().includes(term);
    });
  }, [filter, orders, search]);
  const baseTotal = filter === "refunds" ? pendingCount : filter === "reviewed" ? reviewedCount : orders.length;

  const submitReview = async () => {
    if (!review || !reason.trim() || submitting) return;
    setSubmitting(true);
    try {
      const response = await qurbi.functions.invoke("reviewBuyerRefund", {
        orderId: review.order.id,
        decision: review.decision,
        reason: reason.trim(),
      });
      const updated = response.data?.order;
      if (updated) {
        setOrders((current) => current.map((order) => order.id === updated.id ? updated : order));
        window.dispatchEvent(new Event("admin-refunds-changed"));
      }
      toast({ title: review.decision === "approve" ? "Refund approved" : "Refund rejected", description: `Order #${review.order.order_number || review.order.id} has been updated.` });
      setReview(null);
      setReason("");
    } catch (reviewError) {
      setError(reviewError.response?.data?.error || reviewError.message || "Refund review failed");
      toast({ variant: "destructive", title: "Refund review failed", description: reviewError.message || "Please try again." });
      setReview(null);
    } finally {
      setSubmitting(false);
    }
  };

  const chipOptions = FILTERS.map((item) => ({ ...item, count: item.value === "refunds" ? pendingCount : item.value === "reviewed" ? reviewedCount : orders.length }));

  return (
    <div className="animate-fade-in">
      <AdminPageHeader
        eyebrow="Marketplace management"
        title="Orders & refunds"
        description="Buyer orders from the QURBI User app. Refund requests need your review."
        actions={<Button variant="outline" onClick={load} disabled={loading} aria-label="Refresh orders" className="rounded-full px-3 sm:px-4"><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /><span className="hidden sm:inline">Refresh</span></Button>}
      />

      {pendingCount > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="text-sm font-extrabold">{pendingCount} refund request{pendingCount === 1 ? "" : "s"} awaiting review</p><p className="mt-0.5 text-sm text-destructive/85">Read the buyer&apos;s reason and order details before approving or rejecting.</p></div>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips label="Filter orders" options={chipOptions} value={filter} onChange={setFilter} />
        <SearchField id="order-search" label="Search orders" value={search} onChange={setSearch} placeholder="Order number or buyer" disabled={loading} className="lg:w-80" />
      </div>

      {error && (
        <div className="mt-4 flex flex-wrap items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">{error}</span>
          <Button variant="outline" onClick={load} disabled={loading}>Try again</Button>
        </div>
      )}

      <div className="mb-3 mt-5">{!loading && !error && <ResultCount shown={shownOrders.length} total={baseTotal} noun="order" />}</div>
      {loading ? <ListSkeleton rows={3} /> : shownOrders.length ? (
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
          {shownOrders.map((order) => {
            const pendingRefund = isPendingRefund(order);
            const info = orderStatusInfo(order);
            const buyer = buyerOf(order);
            return (
              <article key={order.id} className={cn("soft-card overflow-hidden", pendingRefund && "border-destructive/40")}>
                <div className="flex items-start justify-between gap-3 p-4 pb-3">
                  <div className="min-w-0">
                    <p className="break-all text-sm font-extrabold tabular-nums text-primary">#{order.order_number || order.id}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(order.created_date, "Date unavailable")}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge tone={info.tone} dot>{info.label}</StatusBadge>
                    {info.refundNote && <StatusBadge tone="muted">{info.refundNote}</StatusBadge>}
                  </div>
                </div>

                {info.next && (
                  <p className={cn("mx-4 flex items-start gap-2 rounded-xl px-3 py-2 text-sm", pendingRefund ? "bg-destructive/10 font-bold text-destructive" : "bg-muted/60 text-foreground/80")}>
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0" />
                    <span><span className="font-bold">Next:</span> {info.next}</span>
                  </p>
                )}

                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Buyer</p>
                    <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-bold"><UserRound className="h-3.5 w-3.5 shrink-0 text-primary/70" /><span className="truncate">{buyer.name}</span></p>
                    {buyer.email && <p className="truncate text-xs text-muted-foreground">{buyer.email}</p>}
                    {buyer.phone && <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3 shrink-0" />{buyer.phone}</p>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Fulfilment</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-bold">{order.fulfillment_method === "pickup" ? <MapPin className="h-3.5 w-3.5 text-primary/70" /> : <Truck className="h-3.5 w-3.5 text-primary/70" />}{order.fulfillment_method === "pickup" ? "Self pickup" : "Delivery"}</p>
                    {order.deliveryAddress?.city && <p className="truncate text-xs text-muted-foreground">{[order.deliveryAddress.city, order.deliveryAddress.state].filter(Boolean).join(", ")}</p>}
                  </div>
                </div>

                <ul className="mx-4 space-y-2 border-t border-border/70 pt-3">
                  {(order.items || []).map((item, index) => (
                    <li key={`${item.livestock_id || "item"}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate"><strong>{itemTitle(item)}</strong>{Number(item.quantity) > 1 ? ` × ${item.quantity}` : ""}</span>
                      <span className="shrink-0 font-bold tabular-nums">{formatPrice(item.total ?? item.price_per_head)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mx-4 mt-3 flex items-center justify-between border-t border-border/70 py-3">
                  <span className="text-sm text-muted-foreground">Order total</span>
                  <span className="text-lg font-extrabold tabular-nums text-primary">{formatPrice(orderTotal(order))}</span>
                </div>

                {(order.refund_reason || order.refundReason || order.refund_admin_note) && (
                  <div className="mx-4 mb-4 rounded-xl bg-amber-50 p-3 text-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-800">{pendingRefund ? "Buyer refund reason" : "Refund reason / admin note"}</p>
                    <p className="mt-1 break-words text-amber-950">{order.refund_reason || order.refundReason || "No reason supplied"}</p>
                    {order.refund_admin_note && <><p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Admin review reason</p><p className="mt-1">{order.refund_admin_note}</p></>}
                  </div>
                )}

                {pendingRefund && (
                  <div className="grid grid-cols-2 gap-2 border-t border-border/70 bg-muted/20 p-3">
                    <Button variant="outline" className="border-destructive/40 text-destructive hover:text-destructive" onClick={() => { setReview({ order, decision: "reject" }); setReason(""); }}><X className="h-4 w-4" />Reject refund</Button>
                    <Button onClick={() => { setReview({ order, decision: "approve" }); setReason(""); }}><Check className="h-4 w-4" />Approve refund</Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={filter === "refunds" ? RotateCcw : ShoppingBag}
          title={search ? "No matching orders" : filter === "refunds" ? "No refund requests" : filter === "reviewed" ? "No reviewed refunds yet" : "No orders yet"}
          description={search ? "Try another order number or buyer name." : filter === "refunds" ? "All caught up. New buyer refund requests will appear here." : filter === "reviewed" ? "Refunds you approve or reject will be listed here." : "Buyer orders will appear here once placed."}
          action={search ? <Button variant="outline" onClick={() => setSearch("")}>Clear search</Button> : filter !== "all" && orders.length ? <Button variant="outline" onClick={() => setFilter("all")}>View all orders</Button> : null}
        />
      )}

      <Dialog open={Boolean(review)} onOpenChange={(open) => { if (!open && !submitting) { setReview(null); setReason(""); } }}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md rounded-3xl">
          <DialogHeader className="text-left">
            <DialogTitle>{review?.decision === "approve" ? "Approve" : "Reject"} refund request?</DialogTitle>
            <DialogDescription>{review?.decision === "approve" ? "The order will be marked as refunded." : "The buyer will see that the refund was rejected."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl bg-muted p-3 text-sm">
              <p className="break-all font-bold">#{review?.order?.order_number || review?.order?.id} · {review?.order ? formatPrice(orderTotal(review.order)) : ""}</p>
              <p className="mt-1 text-sm text-muted-foreground">{review?.order?.refund_reason || review?.order?.refundReason}</p>
            </div>
            <div>
              <Label htmlFor="refund-reason">Reason shown in order record <span className="text-destructive">*</span></Label>
              <Textarea id="refund-reason" className="mt-1.5" value={reason} onChange={(event) => setReason(event.target.value)} rows={4} placeholder="Explain this decision..." />
              <p className="mt-1 text-xs text-muted-foreground">Required. Visible to the buyer.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => { setReview(null); setReason(""); }} disabled={submitting}>Cancel</Button>
              <Button onClick={submitReview} disabled={!reason.trim() || submitting} variant={review?.decision === "approve" ? "default" : "destructive"}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />}Confirm {review?.decision === "approve" ? "approval" : "rejection"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
