import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { qurbi } from "@/api/qurbiClient";
import { resolveApiAssetUrl } from "@/api/apiClient";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Check,
  CircleDollarSign,
  Clock3,
  ImageOff,
  Loader2,
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
import StickyActionBar from "@/components/agri/StickyActionBar";
import { formatDateTime, formatMYR, humanize, orderItemTitle, orderPhotoStage, orderStatusMeta, paymentStatusLabel } from "@/lib/agri";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: "before", label: "Before delivery", short: "before-delivery", description: "Photo of the animal and its condition before it leaves your farm.", owner: "You" },
  { key: "during", label: "During delivery", short: "during-delivery", description: "Photo of the animal safely loaded or on the way.", owner: "You" },
  { key: "after", label: "Arrival / handover", short: "arrival", description: "Photo when you hand the animal to the buyer.", owner: "You" },
  { key: "received", label: "Received by buyer", short: "buyer", description: "The buyer confirms receipt with their own photo.", owner: "Buyer" },
];

const ISSUE_STATUSES = ["return_requested", "refund_requested", "return_refund", "refunded"];

function errorMessage(error, fallback) {
  return error?.response?.data?.error || error?.data?.error || error?.message || fallback;
}

function DetailSkeleton() {
  return <div className="space-y-4"><div className="flex gap-3"><Skeleton className="h-11 w-11 rounded-full" /><div className="space-y-2"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-24" /></div></div>{[0, 1, 2].map((item) => <Skeleton key={item} className="h-40 w-full rounded-2xl" />)}</div>;
}

function InfoRow({ icon: Icon, label, value }) {
  return <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="break-words text-base font-bold">{value || "Not available"}</p></div></div>;
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
  const fileInputRef = useRef(null);

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

  const chooseFile = (stage, file) => {
    if (!file) return;
    setError("");
    setMessage("");
    if (!file.type.startsWith("image/")) { setError("Please choose a photo (image file)."); return; }
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
      setMessage(`${STAGES.find((item) => item.key === stage)?.label} photo saved. The buyer can now see it.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (uploadError) {
      setError(errorMessage(uploadError, "The photo could not be saved. Please try again."));
      await load();
    } finally {
      setUploading("");
    }
  };

  if (loading) return <DetailSkeleton />;
  if (!order) return (
    <div className="py-16 text-center">
      <PackageCheck className="mx-auto h-11 w-11 text-muted-foreground" />
      <p className="mt-3 text-lg font-extrabold">Order unavailable</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{error || "This order does not exist or does not belong to your account."}</p>
      <div className="mt-5 flex justify-center gap-2"><Button variant="outline" onClick={() => navigate("/orders")} className="h-11">Back to orders</Button><Button onClick={load} className="h-11"><RefreshCw className="mr-1.5 h-4 w-4" />Try again</Button></div>
    </div>
  );

  const tracking = order.tracking_photos || {};
  const meta = orderStatusMeta(order.status);
  const hasIssue = ISSUE_STATUSES.includes(order.status);
  // The backend moves an order one step per photo (paid -> preparing -> in transit -> delivered),
  // so the stage the farmer can upload is decided by the order status.
  const nextStage = order.tracking_enabled !== false && !hasIssue ? orderPhotoStage(order.status) : "";
  const nextStageInfo = STAGES.find((stage) => stage.key === nextStage);
  const nextIndex = STAGES.findIndex((stage) => stage.key === nextStage);
  const statusIndex = meta.group === "buyer" ? 3 : meta.group === "done" ? 4 : nextIndex;
  const shippedAt = tracking.during?.uploaded_at || tracking.after?.uploaded_at || order.deliveredAt || "";
  const receivedProof = (order.receivedProofImages || []).map((url) => resolveApiAssetUrl(url));
  const orderNo = order.order_number || order.id;

  return <div className="animate-fade-in">
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={() => navigate("/orders")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted" aria-label="Back to orders"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0"><h1 className="truncate text-xl font-extrabold">Order details</h1><p className="truncate whitespace-nowrap text-sm text-muted-foreground">#{orderNo}</p></div>
      </div>
      <Button variant="outline" size="icon" onClick={load} disabled={Boolean(uploading)} aria-label="Refresh order" className="h-11 w-11 rounded-2xl"><RefreshCw className="h-4 w-4" /></Button>
    </div>

    {message && <p role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"><Check className="mt-0.5 h-4 w-4 shrink-0" />{message}</p>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p>}
    {order.multi_farmer_order && <div className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>This order contains packages from multiple farmers. Photo upload is locked so one farmer can&apos;t change another farmer&apos;s delivery status.</span></div>}
    {hasIssue && <div className="mt-4 flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>Delivery steps are paused because this order has a return or refund in progress.</span></div>}

    <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
      <div className="min-w-0 space-y-4">
        <section className={cn("rounded-2xl border p-4", nextStage ? "border-amber-300 bg-amber-50/70" : "border-border bg-card")}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted-foreground">Order status</p>
            <StatusBadge kind="order" status={order.status} dot />
          </div>
          {meta.next && <p className={cn("mt-3 text-base font-bold leading-snug", nextStage ? "text-amber-950" : "text-foreground")}>{meta.next}</p>}
          <ol className="mt-4 grid grid-cols-4 gap-1.5" aria-label="Delivery progress">
            {STAGES.map((stage, index) => {
              const done = stage.key === "received" ? meta.group === "done" : Boolean(tracking[stage.key]?.image_url) || index < statusIndex;
              const current = index === statusIndex;
              return (
                <li key={stage.key} className="min-w-0">
                  <div className={cn("h-1.5 rounded-full", done ? "bg-primary" : current ? "bg-amber-400" : "bg-muted")} />
                  <p className={cn("mt-1.5 text-xs font-semibold leading-tight", done ? "text-primary" : current ? "text-amber-900" : "text-muted-foreground")}>{stage.key === "after" ? "Arrival" : stage.key === "received" ? "Buyer" : humanize(stage.key)}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-lg font-extrabold">Animal</h2>
          <div className="mt-3 space-y-3">{order.items?.map((item, index) => {
            const { title, breed } = orderItemTitle(item);
            return (
              <article key={`${item.livestock_id}-${index}`} className="flex gap-3 rounded-xl bg-muted/60 p-3">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background">{item.image_url ? <img src={item.image_url} alt={title} className="h-full w-full object-cover" /> : <ImageOff className="h-6 w-6 text-muted-foreground" />}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-extrabold leading-snug">{title}</p>
                  {breed && <p className="truncate text-sm font-semibold text-muted-foreground">{breed}</p>}
                  {item.tag_number && <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><Tag className="h-3.5 w-3.5" />{item.tag_number}</p>}
                  <p className="mt-1.5 text-base font-extrabold text-primary">{formatMYR(item.total)}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">Livestock ID: {item.livestock_id || "Unavailable"}</p>
                </div>
              </article>
            );
          })}</div>
          <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Farmer subtotal</span><span>{formatMYR(order.farmer_subtotal ?? order.farmer_total)}</span></div>
            {Number(order.farmer_delivery_fee) > 0 && <div className="flex justify-between text-muted-foreground"><span>Your delivery fee portion</span><span>{formatMYR(order.farmer_delivery_fee)}</span></div>}
            <div className="flex justify-between text-base font-extrabold"><span>You receive</span><span className="text-primary">{formatMYR(order.farmer_total)}</span></div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-lg font-extrabold">Order &amp; buyer</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoRow icon={CalendarDays} label="Order date" value={formatDateTime(order.created_date, "Not available")} />
            <InfoRow icon={CircleDollarSign} label="Payment" value={paymentStatusLabel(order.payment_status)} />
            <InfoRow icon={Truck} label="Fulfilment method" value={order.fulfillment_method === "pickup" ? "Buyer pickup" : "Delivery"} />
            <InfoRow icon={Clock3} label="Shipment date" value={shippedAt ? formatDateTime(shippedAt) : "Not shipped yet"} />
            <InfoRow icon={UserRound} label="Buyer name" value={order.buyer_name} />
            <InfoRow icon={Phone} label="Contact number" value={order.buyer_phone || "Not provided"} />
            <InfoRow icon={MapPinned} label="Delivery information" value={order.fulfillment_method === "pickup" ? "Buyer pickup" : "Delivery selected"} />
          </div>
          {order.buyer_phone && <a href={`tel:${order.buyer_phone}`} className="mt-4 flex min-h-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/5 text-sm font-bold text-primary"><Phone className="mr-2 h-4 w-4" />Call buyer</a>}
        </section>

        {(order.refund_reason || order.refund_status) && <section className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4"><h2 className="text-lg font-extrabold text-destructive">Return / refund</h2>{order.refund_status && <p className="mt-2 text-sm"><span className="font-semibold">Status: </span>{humanize(order.refund_status)}</p>}{order.refund_reason && <p className="mt-1 text-sm"><span className="font-semibold">Reason: </span>{order.refund_reason}</p>}{order.refund_admin_note && <p className="mt-1 text-sm"><span className="font-semibold">Admin note: </span>{order.refund_admin_note}</p>}</section>}
      </div>

      <section className="mt-4 min-w-0 rounded-2xl border border-border bg-card p-4 lg:mt-0">
        <h2 className="text-lg font-extrabold">Delivery photos</h2>
        <p className="mt-1 text-sm text-muted-foreground">Upload one photo at each step. The buyer sees each photo as proof of delivery.</p>
        <ol className="mt-5 space-y-4">{STAGES.map((stage, index) => {
          const proof = tracking[stage.key];
          const complete = stage.key === "received" ? meta.group === "done" : Boolean(proof?.image_url);
          const current = stage.key === nextStage;
          const passed = !complete && index < statusIndex;
          return (
            <li key={stage.key} className="flex gap-3">
              <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold", complete ? "bg-primary text-primary-foreground" : current ? "bg-amber-100 text-amber-900 ring-2 ring-amber-300" : "bg-muted text-muted-foreground")}>{complete ? <Check className="h-4 w-4" /> : index + 1}</div>
              <div className="min-w-0 flex-1 border-b border-border pb-4 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="text-base font-extrabold">{stage.label}</p><p className="mt-0.5 text-sm text-muted-foreground">{stage.description}</p></div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">{stage.owner}</span>
                </div>
                {proof?.image_url ? (
                  <div className="mt-3 flex flex-wrap items-end gap-3"><a href={proof.image_url} target="_blank" rel="noreferrer" className="block h-24 w-24 overflow-hidden rounded-xl bg-muted"><img src={proof.image_url} alt={`${stage.label} proof`} className="h-full w-full object-cover" /></a><p className="flex items-center gap-1 text-sm text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{formatDateTime(proof.uploaded_at)}</p></div>
                ) : stage.key === "received" && receivedProof.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">{receivedProof.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="block h-24 w-24 overflow-hidden rounded-xl bg-muted"><img src={url} alt="Buyer receipt proof" className="h-full w-full object-cover" /></a>)}</div>
                ) : current ? (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{uploading === stage.key ? "Uploading..." : "Waiting for this photo. Use the button at the bottom of the screen."}</p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {stage.key === "received" ? (meta.group === "done" ? "The buyer confirmed receipt." : "The buyer confirms after your arrival photo.")
                      : order.tracking_enabled === false ? "Photo upload is locked for this multi-farmer order."
                        : hasIssue ? "Paused during the return / refund."
                          : passed ? "No photo was recorded for this step."
                            : meta.group === "payment" ? "Available after the buyer pays."
                              : "Comes after the previous step."}
                  </p>
                )}
              </div>
            </li>
          );
        })}</ol>
      </section>
    </div>

    {nextStageInfo && (
      <StickyActionBar hint={<>Step {nextIndex + 1} of 3: <strong className="text-foreground">{nextStageInfo.label}</strong></>}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          disabled={Boolean(uploading)}
          onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; chooseFile(nextStageInfo.key, file); }}
        />
        <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={Boolean(uploading)} className="h-12 flex-1 rounded-2xl text-base font-bold">
          {uploading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Camera className="mr-2 h-5 w-5" />}
          {uploading ? "Uploading photo..." : `Upload ${nextStageInfo.short} photo`}
        </Button>
      </StickyActionBar>
    )}

    <AlertDialog open={Boolean(pendingUpload)} onOpenChange={(open) => { if (!open && !uploading) setPendingUpload(null); }}>
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
        <AlertDialogHeader><AlertDialogTitle>Save this delivery photo?</AlertDialogTitle><AlertDialogDescription>This saves <strong className="break-all">{pendingUpload?.file?.name}</strong> as the <strong>{STAGES.find((stage) => stage.key === pendingUpload?.stage)?.label.toLowerCase()}</strong> photo for this order. It can&apos;t be changed afterwards, so make sure it&apos;s clear and shows the right animal.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={Boolean(uploading)} className="h-11">Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmUpload} disabled={Boolean(uploading)} className="h-11">{uploading ? "Uploading..." : "Save photo"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
