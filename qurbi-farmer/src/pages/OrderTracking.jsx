import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { qurbi } from "@/api/qurbiClient";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Check,
  CircleDollarSign,
  CircleX,
  Clock3,
  ExternalLink,
  ImageOff,
  MapPinned,
  PackageCheck,
  Phone,
  RefreshCw,
  ShieldAlert,
  Tag,
  Truck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import StatusBadge from "@/components/agri/StatusBadge";
import { formatMYR } from "@/lib/agri";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: "before", label: "Before delivery", description: "Show the livestock and its condition before departure.", owner: "Farmer" },
  { key: "during", label: "During delivery", description: "Show the livestock safely in transit.", owner: "Farmer" },
  { key: "after", label: "After delivery", description: "Show the handover or arrival condition.", owner: "Farmer" },
  { key: "received", label: "Received by buyer", description: "The buyer confirms receipt with their own photo.", owner: "Buyer" },
];

const FARMER_STAGES = STAGES.slice(0, 3);
const TRACKABLE_STATUSES = ["paid", "to_ship", "processing"];
const ISSUE_STATUSES = ["return_requested", "refund_requested", "return_refund", "refunded"];

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
};

function errorMessage(error, fallback) {
  return error?.response?.data?.error || error?.data?.error || error?.message || fallback;
}

function dateTime(value) {
  return value ? new Date(value).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" }) : "Not available";
}

function DetailSkeleton() {
  return <div className="space-y-4"><div className="flex gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-24" /></div></div>{[0, 1, 2].map((item) => <Skeleton key={item} className="h-40 w-full rounded-2xl" />)}</div>;
}

function InfoRow({ icon: Icon, label, value }) {
  return <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[11px] text-muted-foreground">{label}</p><p className="break-words text-sm font-bold">{value || "Not available"}</p></div></div>;
}

export default function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState("");
  const [pendingUpload, setPendingUpload] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await qurbi.functions.invoke("fetchFarmerOrders", { orderId });
      const packageOrder = response.data?.order;
      if (!packageOrder) throw new Error("Package not found.");
      setOrder(packageOrder);
    } catch (loadError) {
      setOrder(null);
      setError(errorMessage(loadError, "Package could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const nextStage = useMemo(
    () => FARMER_STAGES.find((stage) => !order?.tracking_photos?.[stage.key]?.image_url)?.key || "",
    [order],
  );

  const chooseFile = (stage, file) => {
    if (!file) return;
    setError("");
    setMessage("");
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("The photo must be 10 MB or smaller."); return; }
    setPendingUpload({ stage, file });
  };

  const confirmUpload = async () => {
    if (!pendingUpload || uploading || !order) return;
    const { stage, file } = pendingUpload;
    setPendingUpload(null);
    setUploading(stage);
    setError("");
    setMessage("");
    try {
      const uploaded = await qurbi.integrations.Core.UploadFile({ file });
      if (!uploaded.file_url) throw new Error("Photo upload failed.");
      const response = await qurbi.functions.invoke("uploadFarmerTrackingPhoto", {
        orderId: order.id,
        stage,
        imageUrl: uploaded.file_url,
      });
      setOrder(response.data?.order || order);
      setMessage(`${STAGES.find((item) => item.key === stage)?.label} photo saved.`);
    } catch (uploadError) {
      setError(errorMessage(uploadError, "Tracking photo could not be saved."));
      await load();
    } finally {
      setUploading("");
    }
  };

  if (loading) return <DetailSkeleton />;
  if (!order) return (
    <div className="py-16 text-center">
      <PackageCheck className="mx-auto h-11 w-11 text-muted-foreground" />
      <p className="mt-3 font-extrabold">Order unavailable</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{error || "This order does not exist or does not belong to your account."}</p>
      <div className="mt-5 flex justify-center gap-2"><Button variant="outline" onClick={() => navigate("/orders")}>Back</Button><Button onClick={load}><RefreshCw className="mr-1.5 h-4 w-4" />Retry</Button></div>
    </div>
  );

  const tracking = order.tracking_photos || {};
  const [statusLabel, statusTone] = STATUS_META[order.status] || [order.status?.replaceAll("_", " ") || "Unknown", "muted"];
  const hasIssue = ISSUE_STATUSES.includes(order.status);
  const isCancelled = order.status === "cancelled";
  const canTrack = order.tracking_enabled !== false && TRACKABLE_STATUSES.includes(order.status) && !hasIssue;
  const shippedAt = tracking.after?.uploaded_at || "";

  return <div className="animate-fade-in">
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3"><button onClick={() => navigate("/orders")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted" aria-label="Back to orders"><ArrowLeft className="h-5 w-5" /></button><div className="min-w-0"><h1 className="truncate text-xl font-extrabold">Order Details</h1><p className="truncate text-xs text-muted-foreground">#{order.order_number || order.id}</p></div></div>
      <Button variant="outline" size="icon" onClick={load} disabled={Boolean(uploading)} aria-label="Refresh package"><RefreshCw className="h-4 w-4" /></Button>
    </div>

    {message && <p className="mt-4 rounded-xl bg-primary/10 p-3 text-sm font-semibold text-primary">{message}</p>}
    {error && <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p>}
    {order.multi_farmer_order && <div className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>This order contains packages from multiple farmers. Evidence upload is locked to prevent one farmer from changing another farmer&apos;s fulfilment status.</span></div>}
    {hasIssue && <div className="mt-4 flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>Shipment actions are paused because this order has an active return or refund state.</span></div>}
    {isCancelled && <div className="mt-4 flex gap-2 rounded-xl border border-border bg-muted/55 p-3 text-sm text-foreground"><CircleX className="mt-0.5 h-4 w-4 shrink-0" /><span>This order is closed. No delivery action is required from you.</span></div>}

    <section className="mt-5 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">Order status</p><p className="mt-1 text-lg font-extrabold">#{order.order_number || order.id}</p></div><StatusBadge tone={statusTone} dot>{statusLabel}</StatusBadge></div>
      <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
        <InfoRow icon={CalendarDays} label="Order date" value={dateTime(order.created_date)} />
        <InfoRow icon={CircleDollarSign} label="Payment" value={order.payment_status} />
        <InfoRow icon={Truck} label="Fulfilment method" value={order.fulfillment_method === "pickup" ? "Pickup" : "Delivery"} />
        <InfoRow icon={Clock3} label="Shipment date" value={shippedAt ? dateTime(shippedAt) : "Not shipped yet"} />
      </div>
    </section>

    {isCancelled && (
      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground"><CircleX className="h-5 w-5" /></span><div className="min-w-0"><h2 className="font-extrabold">Cancellation summary</h2><p className="mt-0.5 text-xs text-muted-foreground">The reservation has been released. An eligible listing is returned to the marketplace automatically.</p></div></div>
        <div className="mt-4 grid gap-3 rounded-xl bg-muted/45 p-3 text-sm sm:grid-cols-2"><div><p className="text-[11px] text-muted-foreground">Cancelled by</p><p className="mt-0.5 font-bold">{order.cancelled_by || "Buyer"}</p></div><div><p className="text-[11px] text-muted-foreground">Cancelled at</p><p className="mt-0.5 font-bold">{dateTime(order.cancelled_at)}</p></div><div className="sm:col-span-2"><p className="text-[11px] text-muted-foreground">Reason</p><p className="mt-0.5 whitespace-pre-wrap font-semibold">{order.cancellation_reason || "No cancellation reason was provided."}</p></div></div>
      </section>
    )}

    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-extrabold">Livestock information</h2>
      <div className="mt-3 space-y-3">{order.items?.map((item, index) => (
        <article key={`${item.livestock_id}-${index}`} className="flex gap-3 rounded-xl bg-muted/60 p-3">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background">{item.image_url ? <img src={item.image_url} alt={`${item.species} ${item.breed}`} className="h-full w-full object-cover" /> : <ImageOff className="h-6 w-6 text-muted-foreground" />}</div>
          <div className="min-w-0 flex-1"><p className="text-base font-extrabold">{item.species || "Livestock"}</p><p className="truncate text-sm font-semibold text-muted-foreground">{item.breed || "Unspecified breed"}</p>{item.tag_number && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" />{item.tag_number}</span></div>}<p className="mt-2 text-sm font-extrabold text-primary">{formatMYR(item.total)}</p><p className="mt-1 truncate text-[10px] text-muted-foreground">Livestock ID: {item.livestock_id || item.bulk_listing_id || "Unavailable"}</p>{isCancelled && (item.livestock_id || item.bulk_listing_id) && <button type="button" onClick={() => navigate(item.livestock_id ? `/livestock/${item.livestock_id}` : `/bulk/${item.bulk_listing_id}`)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary">View listing <ExternalLink className="h-3.5 w-3.5" /></button>}</div>
        </article>
      ))}</div>
      <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm"><div className="flex justify-between text-muted-foreground"><span>Farmer subtotal</span><span>{formatMYR(order.farmer_subtotal)}</span></div>{Number(order.farmer_delivery_fee) > 0 && <div className="flex justify-between text-muted-foreground"><span>Your delivery fee portion</span><span>{formatMYR(order.farmer_delivery_fee)}</span></div>}<div className="flex justify-between font-extrabold"><span>Order total</span><span className="text-primary">{formatMYR(order.farmer_total)}</span></div></div>
    </section>

    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-extrabold">Buyer &amp; fulfilment</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><InfoRow icon={UserRound} label="Buyer name" value={order.buyer_name} /><InfoRow icon={Phone} label="Contact number" value={order.buyer_phone || "Not provided"} /><InfoRow icon={MapPinned} label="Delivery information" value={order.fulfillment_method === "pickup" ? "Buyer pickup" : "Delivery selected"} /></div>
      {order.buyer_phone && <a href={`tel:${order.buyer_phone}`} className="mt-4 flex min-h-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/5 text-sm font-bold text-primary"><Phone className="mr-2 h-4 w-4" />Call buyer</a>}
    </section>

    {(order.refund_reason || order.refund_status) && <section className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-4"><h2 className="font-extrabold text-destructive">Return / Refund</h2>{order.refund_status && <p className="mt-2 text-sm"><span className="font-semibold">Status: </span>{order.refund_status.replaceAll("_", " ")}</p>}{order.refund_reason && <p className="mt-1 text-sm"><span className="font-semibold">Reason: </span>{order.refund_reason}</p>}{order.refund_admin_note && <p className="mt-1 text-sm"><span className="font-semibold">Admin note: </span>{order.refund_admin_note}</p>}</section>}

    {!isCancelled && <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-extrabold">Delivery evidence timeline</h2><p className="mt-1 text-xs text-muted-foreground">Upload the three farmer photos in order. The buyer&apos;s confirmation unlocks afterwards.</p>
      <div className="mt-5 space-y-4">{STAGES.map((stage, index) => {
        const proof = tracking[stage.key];
        const complete = Boolean(proof?.image_url);
        const farmerStage = stage.owner === "Farmer";
        const unlocked = farmerStage && stage.key === nextStage && canTrack;
        return <div key={stage.key} className="flex gap-3"><div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", complete ? "bg-primary text-primary-foreground" : unlocked ? "bg-primary/15 text-primary ring-2 ring-primary/20" : "bg-muted text-muted-foreground")}>{complete ? <Check className="h-4 w-4" /> : index + 1}</div><div className="min-w-0 flex-1 border-b border-border pb-4 last:border-0"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-extrabold">{stage.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{stage.description}</p></div><span className="shrink-0 text-[11px] font-bold text-muted-foreground">{stage.owner}</span></div>
          {complete ? <div className="mt-3 flex flex-wrap items-end gap-3"><a href={proof.image_url} target="_blank" rel="noreferrer" className="block h-24 w-24 overflow-hidden rounded-xl bg-muted"><img src={proof.image_url} alt={`${stage.label} proof`} className="h-full w-full object-cover" /></a><p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{dateTime(proof.uploaded_at)}</p></div>
          : unlocked ? <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/35 bg-primary/5 px-3 text-sm font-bold text-primary"><Camera className="h-4 w-4" /><span>{uploading === stage.key ? "Uploading..." : `Choose ${stage.label.toLowerCase()} photo`}</span><input type="file" accept="image/*" capture="environment" className="sr-only" disabled={Boolean(uploading)} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; chooseFile(stage.key, file); }} /></label>
          : <p className="mt-3 text-xs font-semibold text-muted-foreground">{stage.key === "received" ? "Waiting for buyer confirmation after all farmer evidence is complete." : order.tracking_enabled === false ? "Tracking is locked for this multi-farmer order." : hasIssue ? "Tracking is paused for the return/refund process." : canTrack ? "Complete the previous photo first." : "This package is not awaiting a farmer update."}</p>}
        </div></div>;
      })}</div>
    </section>}

    <AlertDialog open={Boolean(pendingUpload)} onOpenChange={(open) => { if (!open && !uploading) setPendingUpload(null); }}>
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
        <AlertDialogHeader><AlertDialogTitle>Upload delivery evidence?</AlertDialogTitle><AlertDialogDescription>This will permanently save <strong>{pendingUpload?.file?.name}</strong> as the {pendingUpload?.stage} stage for this buyer&apos;s order. Make sure the photo is clear and belongs to this package.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={Boolean(uploading)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmUpload} disabled={Boolean(uploading)}>{uploading ? "Uploading..." : "Upload photo"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
