import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Camera,
  Check,
  CircleAlert,
  Clock3,
  ImagePlus,
  MapPin,
  Package,
  ReceiptText,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { qurbiApi } from "@/api/qurbiClient";
import { useAuth } from "@/lib/AuthContext";
import { useAuthPrompt } from "@/lib/auth-prompt-context";
import { formatOrderDateTime } from "@/lib/order-date";
import { formatRM } from "@/lib/format";
import ImageLightbox from "@/components/ImageLightbox";
import AppHeader from "@/components/AppHeader";
import PageLoading from "@/components/PageLoading";
import StatusChip from "@/components/account/StatusChip";
import StickyActionBar from "@/components/account/StickyActionBar";
import {
  PAID_STATUSES,
  PROGRESS_STEPS,
  RECEIVABLE_STATUSES,
  orderRefundStatus,
  orderStatusInfo,
  progressIndex,
} from "@/components/account/orderStatus";
import { accountMediaUrl, orderProofPhotos } from "@/components/account/media";
import { shortDateTime } from "@/components/account/dates";
import { primaryBtn, secondaryBtn } from "@/components/account/buttons";

const TRACKING_STAGES = [
  {
    key: "before",
    labelKey: "orderDetail.stages.before",
    ownerKey: "orderDetail.stages.ownerFarmer",
  },
  {
    key: "during",
    labelKey: "orderDetail.stages.during",
    ownerKey: "orderDetail.stages.ownerFarmer",
  },
  {
    key: "after",
    labelKey: "orderDetail.stages.after",
    ownerKey: "orderDetail.stages.ownerFarmer",
  },
  {
    key: "received",
    labelKey: "orderDetail.stages.received",
    ownerKey: "orderDetail.stages.ownerYou",
  },
];

const TAB_FOR_STATUS = {
  pending: "to-pay",
  pending_payment: "to-pay",
  to_pay: "to-pay",
  cancelled: "to-pay",
  out_of_stock: "to-pay",
  paid: "to-ship",
  preparing: "to-ship",
  to_ship: "to-ship",
  processing: "to-ship",
  in_transit: "to-receive",
  shipped: "to-receive",
  to_receive: "to-receive",
  delivering: "to-receive",
  delivered: "to-receive",
  completed: "completed",
  received: "completed",
  return_requested: "return-refund",
  refund_requested: "return-refund",
  return_refund: "return-refund",
  refunded: "return-refund",
};

const cardCls = "qurbi-dark-surface rounded-2xl border p-4 shadow-md";

// Previous stage-by-stage tracking layout (not currently rendered).
function LegacyOrderTracking({ order, onPreview }) {
  const { t } = useTranslation("orders");
  const tracking = order.tracking_photos || {};

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
      <h2 className="text-gray-900 font-bold">{t("orderDetail.legacyTracking.title")}</h2>

      <p className="mt-1 text-xs text-gray-400">
        {t("orderDetail.legacyTracking.stagesLine")}
      </p>

      <div className="mt-4 space-y-3">
        {TRACKING_STAGES.map((stage, index) => {
          const proof = tracking[stage.key];

          const priorComplete = TRACKING_STAGES.slice(0, index).every(
            (prior) => tracking[prior.key]?.image_url,
          );

          const awaitingBuyer =
            stage.key === "received" &&
            !TRACKING_STAGES.slice(0, 3).every(
              (farmerStage) => tracking[farmerStage.key]?.image_url,
            );

          const waitingFor = proof?.image_url
            ? t("orderDetail.legacyTracking.complete")
            : awaitingBuyer
              ? t("orderDetail.legacyTracking.lockedUntilFarmer")
              : priorComplete
                ? t("orderDetail.legacyTracking.waitingFor", {
                    owner: t(stage.ownerKey),
                  })
                : t("orderDetail.legacyTracking.locked");

          return (
            <div key={stage.key} className="flex gap-3">
              <div
                className={`mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full ${
                  proof?.image_url
                    ? "bg-[#F7EDE2]0 text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {proof?.image_url ? <Check className="h-4 w-4" /> : index + 1}
              </div>

              <div className="min-w-0 flex-1 border-b border-gray-50 pb-3 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      {t(stage.labelKey)}
                    </p>

                    <p className="text-xs text-gray-400">
                      {t("orderDetail.legacyTracking.action", {
                        owner: t(stage.ownerKey),
                      })}
                    </p>
                  </div>

                  <span
                    className={`text-[11px] font-semibold text-right ${
                      proof?.image_url ? "text-[#5A493C]" : "text-gray-400"
                    }`}
                  >
                    {waitingFor}
                  </span>
                </div>

                {proof?.image_url && (
                  <button
                    type="button"
                    onClick={() =>
                      onPreview(
                        proof.image_url,
                        t("orderDetail.proofAlt", { stage: t(stage.labelKey) }),
                      )
                    }
                    className="mt-2 block h-24 w-24 overflow-hidden rounded-xl bg-gray-100"
                  >
                    <img
                      src={proof.image_url}
                      alt={t("orderDetail.proofAlt", { stage: t(stage.labelKey) })}
                      className="h-full w-full object-cover"
                    />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OrderTracking({ order, photos, onPreview }) {
  const { t } = useTranslation("orders");
  const { t: ta } = useTranslation("account");

  const proofs = TRACKING_STAGES.map((stage) => ({
    ...stage,
    image: photos[stage.key]?.image_url,
  })).filter((proof) => proof.image);

  const [selectedKey, setSelectedKey] = useState(() => proofs[0]?.key || "");

  const selected =
    proofs.find((proof) => proof.key === selectedKey) || proofs[0];

  useEffect(() => {
    if (!proofs.some((proof) => proof.key === selectedKey)) {
      setSelectedKey(proofs[0]?.key || "");
    }
  }, [order.id, selectedKey, proofs]);

  return (
    <section className={cardCls} aria-labelledby="proof-title">
      <h2 id="proof-title" className="text-base font-bold text-white">
        {t("orderDetail.tracking.title")}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-white/80">
        {ta("orderDetail.proof.subtitle")}
      </p>

      <ol className="mt-3 grid grid-cols-4 gap-1.5">
        {TRACKING_STAGES.map((stage) => {
          const done = Boolean(photos[stage.key]?.image_url);
          return (
            <li
              key={stage.key}
              className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center ${done ? "bg-[#E3C19F] text-[#41362D]" : "bg-white/10 text-white/85"}`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ${done ? "bg-[#41362D] text-white" : "border border-white/50"}`}
                aria-hidden="true"
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
              </span>
              <span className="text-xs font-bold leading-tight">{t(stage.labelKey)}</span>
              <span className="text-xs leading-tight opacity-80">
                {done ? ta("orderDetail.proof.done") : t(stage.ownerKey)}
              </span>
            </li>
          );
        })}
      </ol>

      {selected ? (
        <>
          <button
            type="button"
            onClick={() =>
              onPreview(
                selected.image,
                t("orderDetail.proofAlt", { stage: t(selected.labelKey) }),
              )
            }
            aria-label={ta("orderDetail.proof.open", { stage: t(selected.labelKey) })}
            className="mt-4 flex h-56 w-full items-center justify-center overflow-hidden rounded-2xl bg-black/20"
          >
            <img
              src={selected.image}
              alt={t("orderDetail.proofAlt", { stage: t(selected.labelKey) })}
              className="h-full w-full object-contain"
            />
          </button>

          {proofs.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {proofs.map((proof) => (
                <button
                  type="button"
                  key={proof.key}
                  onClick={() => setSelectedKey(proof.key)}
                  aria-pressed={selected.key === proof.key}
                  className={`flex-none overflow-hidden rounded-xl border-2 p-0.5 ${
                    selected.key === proof.key
                      ? "border-[#E3C19F]"
                      : "border-transparent"
                  }`}
                >
                  <img
                    src={proof.image}
                    alt={t(proof.labelKey)}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <span className="block px-1 pb-1 pt-0.5 text-xs font-bold text-white">
                    {t(proof.labelKey)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="mt-4 rounded-xl bg-white/10 px-3 py-3 text-sm leading-relaxed text-white/90">
          {t("orderDetail.tracking.noProofYet")} {ta("orderDetail.proof.emptyHint")}
        </p>
      )}
    </section>
  );
}

function ProgressTimeline({ order }) {
  const { t: ta } = useTranslation("account");
  const reached = progressIndex(order);
  const status = orderStatusInfo(order);
  const stopped = ["cancelled", "outOfStock"].includes(status.key);
  const events = Array.isArray(order.tracking_events) ? order.tracking_events : [];
  const eventDate = (statuses) => {
    const match = events
      .filter((event) => statuses.includes(String(event?.status || "").toLowerCase()))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    return match?.createdAt || "";
  };

  return (
    <section className={cardCls} aria-labelledby="progress-title">
      <h2 id="progress-title" className="text-base font-bold text-white">
        {ta("orderDetail.timeline.title")}
      </h2>
      <ol className="mt-3">
        {PROGRESS_STEPS.map((step, index) => {
          const done = index <= reached;
          const current = index === reached + 1 && !stopped;
          const date = step.key === "placed" ? order.created_date : eventDate(step.statuses);
          const last = index === PROGRESS_STEPS.length - 1;
          return (
            <li key={step.key} className="relative flex gap-3 pb-4 last:pb-0">
              {!last && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[13px] top-7 h-[calc(100%-1.5rem)] w-0.5 ${index < reached ? "bg-[#E3C19F]" : "bg-white/20"}`}
                />
              )}
              <span
                aria-hidden="true"
                className={`relative z-10 flex h-7 w-7 flex-none items-center justify-center rounded-full ${done ? "bg-[#E3C19F] text-[#41362D]" : current ? "border-2 border-[#E3C19F] bg-[#41362D]" : "border-2 border-white/30 bg-transparent"}`}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : current ? <span className="h-2.5 w-2.5 rounded-full bg-[#E3C19F]" /> : null}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className={`text-[15px] font-bold leading-snug ${done || current ? "text-white" : "text-white/60"}`}>
                  {ta(`orderDetail.timeline.steps.${step.key}`)}
                  {current && (
                    <span className="ml-2 text-xs font-semibold text-[#E3C19F]">
                      {ta("orderDetail.timeline.next")}
                    </span>
                  )}
                </p>
                {done && date && (
                  <p className="text-[13px] text-white/75">{shortDateTime(date, ta)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {stopped && (
        <p className="mt-3 rounded-xl bg-white/10 px-3 py-2.5 text-sm text-white/90">
          {ta(status.hintKey)}
        </p>
      )}
    </section>
  );
}

function RefundRequestSheet({ order, loading, error, onClose, onSubmit }) {
  const { t } = useTranslation("orders");
  const { t: ta } = useTranslation("account");
  const [reason, setReason] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setReason("");
    setEvidenceFiles([]);
    setTouched(false);
  }, [order?.id]);

  if (!order) return null;

  const reasonMissing = touched && !reason.trim();
  const photosMissing = touched && !evidenceFiles.length;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end bg-black/45 backdrop-blur-sm sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-sheet-title"
      onClick={() => !loading && onClose()}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[#FFFDF9] p-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[#E3C19F] sm:hidden" />

        <h2 id="refund-sheet-title" className="text-lg font-bold text-[#41362D]">
          {t("orderDetail.refundSheet.title")}
        </h2>

        <p className="mt-1 text-[15px] leading-relaxed text-[#5A493C]">
          {t("orderDetail.refundSheet.subtitle", { orderNumber: order.order_number })}
        </p>

        <label htmlFor="refund-reason" className="mt-4 block text-sm font-bold text-[#41362D]">
          {ta("orderDetail.refund.reasonLabel")} <span className="text-[#9A2E0C]">*</span>
        </label>
        <textarea
          id="refund-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={loading}
          rows={4}
          aria-invalid={reasonMissing}
          aria-describedby={reasonMissing ? "refund-reason-error" : undefined}
          placeholder={t("orderDetail.refundSheet.reasonPlaceholder")}
          className={`mt-1.5 w-full resize-none rounded-xl border-2 bg-white px-3 py-3 text-[15px] text-[#41362D] outline-none placeholder:text-[#6B594A]/70 focus:border-[#A9825F] disabled:opacity-60 ${reasonMissing ? "border-[#B42318]" : "border-[#E3C19F]"}`}
        />
        {reasonMissing && (
          <p id="refund-reason-error" className="mt-1 text-sm font-semibold text-[#9A2E0C]">
            {ta("orderDetail.refund.reasonRequired")}
          </p>
        )}

        <label className={`mt-3 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-[#F7EDE2] px-3 py-3 text-center text-[15px] font-bold text-[#41362D] ${photosMissing ? "border-[#B42318]" : "border-[#C49A72]"}`}>
          <Camera className="h-6 w-6" aria-hidden="true" />
          <span className="mt-1">{t("orderDetail.refundSheet.uploadLabel")} *</span>
          <span className="mt-0.5 text-[13px] font-medium text-[#5A493C]">
            {t("orderDetail.refundSheet.uploadHint")}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={loading}
            onChange={(event) =>
              setEvidenceFiles(Array.from(event.target.files || []).slice(0, 5))
            }
          />
        </label>

        {evidenceFiles.length > 0 && (
          <p className="mt-2 text-sm font-semibold text-[#41362D]">
            {t("orderDetail.refundSheet.photosSelected", {
              count: evidenceFiles.length,
            })}
          </p>
        )}
        {photosMissing && (
          <p className="mt-1 text-sm font-semibold text-[#9A2E0C]">
            {t("orderDetail.errors.evidenceRequired")}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-[#FBE4E1] px-3 py-2.5 text-sm font-semibold text-[#8A1C12]">
            {error}
          </p>
        )}

        <p className="mt-3 text-[13px] leading-5 text-[#5A493C]">
          {t("orderDetail.refundSheet.disclaimer")}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={secondaryBtn}
          >
            {t("orderDetail.refundSheet.keep")}
          </button>

          <button
            type="button"
            onClick={() => {
              setTouched(true);
              if (!reason.trim() || !evidenceFiles.length) return;
              onSubmit(reason, evidenceFiles);
            }}
            disabled={loading}
            className={primaryBtn}
          >
            {loading
              ? t("orderDetail.refundSheet.submitting")
              : t("orderDetail.refundSheet.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeliveryCard({ order }) {
  const { t: ta } = useTranslation("account");
  const address = order.deliveryAddress || order.delivery_address || null;
  const isPickup = order.fulfillment_method === "pickup";
  const lines = address
    ? [
        address.addressLine1,
        address.addressLine2,
        [address.postcode, address.city].filter(Boolean).join(" "),
        [address.state, address.country].filter(Boolean).join(", "),
      ].filter(Boolean)
    : [];
  const scheduled = order.scheduledDate || order.scheduled_date || "";
  const notes = order.buyerNotes || order.buyer_notes || "";
  if (!lines.length && !scheduled && !notes && !isPickup) return null;
  return (
    <section className={cardCls} aria-labelledby="delivery-title">
      <h2 id="delivery-title" className="flex items-center gap-2 text-base font-bold text-white">
        {isPickup ? <MapPin className="h-5 w-5" aria-hidden="true" /> : <Truck className="h-5 w-5" aria-hidden="true" />}
        {isPickup ? ta("orderDetail.delivery.pickupTitle") : ta("orderDetail.delivery.title")}
      </h2>
      <dl className="mt-3 space-y-2.5 text-[15px]">
        {address?.recipientName && (
          <div>
            <dt className="text-[13px] text-white/70">{ta("orderDetail.delivery.recipient")}</dt>
            <dd className="font-semibold text-white">
              {address.recipientName}
              {address.recipientPhone ? ` · ${address.recipientPhone}` : ""}
            </dd>
          </div>
        )}
        {lines.length > 0 && (
          <div>
            <dt className="text-[13px] text-white/70">{ta("orderDetail.delivery.address")}</dt>
            <dd className="break-words text-white">{lines.join(", ")}</dd>
          </div>
        )}
        {scheduled && (
          <div>
            <dt className="text-[13px] text-white/70">{ta("orderDetail.delivery.scheduled")}</dt>
            <dd className="font-semibold text-white">
              {new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "long", year: "numeric" }).format(new Date(scheduled))}
            </dd>
          </div>
        )}
        {notes && (
          <div>
            <dt className="text-[13px] text-white/70">{ta("orderDetail.delivery.notes")}</dt>
            <dd className="break-words text-white">{notes}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function ItemImage({ src }) {
  const [failed, setFailed] = useState(false);
  const url = accountMediaUrl(src);
  return (
    <div className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-xl bg-[#F7EDE2] text-[#6B594A]">
      {url && !failed ? (
        <img src={url} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <ShoppingBag className="h-6 w-6" aria-hidden="true" />
      )}
    </div>
  );
}

export default function OrderDetail() {
  const { t } = useTranslation("orders");
  const { t: ta } = useTranslation("account");
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();

  const { user, isAuthenticated, authChecked } = useAuth();
  const { requestSignIn } = useAuthPrompt();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [refundSheetOpen, setRefundSheetOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [receivedFile, setReceivedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const loadOrder = useCallback(async () => {
    if (!authChecked) return;

    if (!isAuthenticated || !user?.id) {
      setOrder(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const response = await qurbiApi.functions.invoke("fetchMyOrders", {
        orderId,
      });

      setOrder(response.data?.order || null);
    } catch (error) {
      setLoadError(
        error.data?.error ||
          error.message ||
          t("orderDetail.errors.loadFallback"),
      );
    } finally {
      setLoading(false);
    }
  }, [authChecked, isAuthenticated, orderId, user?.id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(""), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  // Local preview of the photo the buyer picked but has not saved yet.
  const selectedPreview = useMemo(
    () => (receivedFile ? URL.createObjectURL(receivedFile) : ""),
    [receivedFile],
  );
  useEffect(
    () => () => {
      if (selectedPreview) URL.revokeObjectURL(selectedPreview);
    },
    [selectedPreview],
  );

  const confirmReceipt = async () => {
    if (!order || actionLoading) return;

    if (!order.tracking_photos?.received?.image_url) {
      setActionError(
        t("orderDetail.errors.uploadReceivedFirst"),
      );
      return;
    }

    setActionLoading(true);
    setActionError("");

    try {
      const response = await qurbiApi.functions.invoke("confirmMyOrderReceived", {
        orderId: order.id,
      });

      setOrder(
        response.data?.order || {
          ...order,
          status: "completed",
        },
      );

      setMessage(t("orderDetail.confirmSuccess"));
    } catch (error) {
      setActionError(
        error.data?.error ||
          error.message ||
          t("orderDetail.errors.confirmReceiptFallback"),
      );

      await loadOrder();
    } finally {
      setActionLoading(false);
    }
  };

  const saveReceivedProof = async () => {
    if (!order || !receivedFile || actionLoading) return;

    setActionLoading(true);
    setActionError("");

    try {
      const { file_url } = await qurbiApi.integrations.Core.UploadFile({
        file: receivedFile,
      });

      const response = await qurbiApi.functions.invoke(
        "saveMyReceivedOrderProof",
        {
          orderId: order.id,
          receivedPhotoUrl: file_url,
          // Private uploads need an auth header, so show the local file.
          previewUrl: URL.createObjectURL(receivedFile),
        },
      );

      setOrder(response.data?.order || order);
      setReceivedFile(null);
      setMessage(t("orderDetail.saveProofSuccess"));
    } catch (error) {
      setActionError(
        error.data?.error ||
          error.message ||
          t("orderDetail.errors.saveProofFallback"),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const requestRefund = async (reason, evidenceFiles) => {
    if (!order || actionLoading) return;

    setActionLoading(true);
    setActionError("");

    try {
      const files = Array.isArray(evidenceFiles) ? evidenceFiles : [];

      if (!files.length) {
        throw new Error(
          t("orderDetail.errors.evidenceRequired"),
        );
      }

      const evidence = await Promise.all(
        files.map(
          async (file) =>
            (
              await qurbiApi.integrations.Core.UploadFile({
                file,
              })
            ).file_url,
        ),
      );

      const response = await qurbiApi.functions.invoke("requestMyOrderRefund", {
        orderId: order.id,
        reason,
        refundEvidence: evidence,
      });

      setOrder(
        response.data?.order || {
          ...order,
          status: "refund_requested",
          refund_reason: reason,
          refund_evidence: evidence,
          refund_status: "pending_admin_approval",
        },
      );

      setRefundSheetOpen(false);

      setMessage(t("orderDetail.refundRequestSuccess"));
    } catch (error) {
      setActionError(
        error.data?.error ||
          error.message ||
          t("orderDetail.errors.refundRequestFallback"),
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="aisyah-page">
        <AppHeader
          title={t("orderDetail.title")}
          backTo="/orders"
          subtitle={t("orderDetail.loadingSubtitle")}
        />
        <PageLoading contentOnly message={t("orderDetail.loadingMessage")} />
      </div>
    );
  }

  if (authChecked && !isAuthenticated) {
    return (
      <div className="aisyah-page min-h-screen">
        <AppHeader title={t("orderDetail.title")} backTo="/orders" subtitle={t("orderDetail.loadingSubtitle")} />
        <div className="aisyah-content flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Package className="h-12 w-12 text-[#41362D]/40" aria-hidden="true" />
          <p className="max-w-xs text-[15px] text-[#41362D]/75">{t("orderDetail.signInPrompt")}</p>
          <button
            type="button"
            onClick={() => requestSignIn({ returnTo: `/orders/${orderId}`, message: t("orderDetail.signInMessage") })}
            className={`${primaryBtn} mt-2 px-8`}
          >
            {t("orderDetail.signIn")}
          </button>
        </div>
      </div>
    );
  }

  if (loadError || !order) {
    return (
      <div className="aisyah-page min-h-screen">
        <AppHeader title={t("orderDetail.title")} backTo="/orders" subtitle={t("orderDetail.loadingSubtitle")} />
        <div className="aisyah-content flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Package className="h-12 w-12 text-[#41362D]/40" aria-hidden="true" />
          <p className="max-w-sm text-[15px] font-semibold text-[#41362D]">
            {loadError || t("orderDetail.notFound")}
          </p>
          {loadError && (
            <button type="button" onClick={loadOrder} className={`${primaryBtn} px-8`}>
              {t("orderDetail.retry")}
            </button>
          )}
          <Link to="/orders" className={`${secondaryBtn} px-6`}>
            {t("orderDetail.backToOrders")}
          </Link>
        </div>
      </div>
    );
  }

  const status = orderStatusInfo(order);
  const photos = orderProofPhotos(order);
  const canConfirmReceipt = RECEIVABLE_STATUSES.includes(order.status);

  const farmerPhotosComplete = ["before", "during", "after"].every(
    (stage) => photos[stage]?.image_url,
  );
  const receivedProofSaved = Boolean(order.tracking_photos?.received?.image_url);

  const progressImages = Array.isArray(order.progress_images)
    ? order.progress_images.filter(Boolean)
    : [];

  const returnTab =
    searchParams.get("fromTab") || TAB_FOR_STATUS[order.status] || status.tab || "to-pay";

  const refundStatus = orderRefundStatus(order);
  const isRefundRejected = refundStatus === "rejected";
  const hasRefund =
    status.tab === "return-refund" || order.status === "refund_requested" || order.status === "refunded";
  const refundReason = order.refund_reason || order.refundReason || "";
  const refundEvidence = Array.isArray(order.refund_evidence) ? order.refund_evidence : [];
  const refundAdminNote = order.refund_admin_note || order.refundAdminNote || "";
  const isPaid = PAID_STATUSES.includes(order.status) || order.payment_status === "paid";
  const reservationExpiry =
    status.next === "pay" && order.reservation_expires_at && order.reservation_status === "active"
      ? shortDateTime(order.reservation_expires_at, ta)
      : "";

  // Exactly one primary action, pinned above the bottom navigation.
  let stickyAction = null;
  if (status.next === "pay") {
    stickyAction = (
      <Link to={`/payment?order_id=${encodeURIComponent(order.id)}`} className={`${primaryBtn} w-full`}>
        {t("orders.completePayment")}
      </Link>
    );
  } else if (canConfirmReceipt && farmerPhotosComplete) {
    stickyAction = receivedFile ? (
      <button type="button" onClick={saveReceivedProof} disabled={actionLoading} className={`${primaryBtn} w-full`}>
        {actionLoading ? t("orderDetail.confirm.saving") : t("orderDetail.confirm.savePhoto")}
      </button>
    ) : receivedProofSaved ? (
      <button type="button" onClick={confirmReceipt} disabled={actionLoading} className={`${primaryBtn} w-full`}>
        <Check className="h-5 w-5" aria-hidden="true" />
        {actionLoading ? t("orderDetail.confirm.updating") : ta("orderDetail.receive.confirmButton")}
      </button>
    ) : (
      <label htmlFor="received-photo-input" className={`${primaryBtn} w-full cursor-pointer`}>
        <Camera className="h-5 w-5" aria-hidden="true" />
        {t("orderDetail.confirm.uploadPhoto")}
      </label>
    );
  } else if (isPaid && status.tab !== "return-refund") {
    stickyAction = (
      <Link to={`/receipt?order_id=${encodeURIComponent(order.id)}`} className={`${primaryBtn} w-full`}>
        <ReceiptText className="h-5 w-5" aria-hidden="true" />
        {ta("orders.actions.receipt")}
      </Link>
    );
  }

  const receiveStep = !farmerPhotosComplete ? 0 : receivedFile || !receivedProofSaved ? 1 : 2;

  return (
    <div className={`aisyah-page ${stickyAction ? "pb-[calc(11rem+env(safe-area-inset-bottom))]" : ""}`}>
      <AppHeader
        title={t("orderDetail.title")}
        backTo={`/orders?tab=${encodeURIComponent(returnTab)}`}
        subtitle={`${order.order_number} · ${formatOrderDateTime(order.created_date)}`}
      />

      {message && (
        <div
          role="status"
          className="fixed left-4 right-4 top-5 z-50 mx-auto max-w-md rounded-xl bg-[#41362D] px-4 py-3 text-[15px] font-semibold text-white shadow-lg"
        >
          {message}
        </div>
      )}

      <main className="aisyah-content mx-auto max-w-3xl space-y-3">
        {actionError && !refundSheetOpen && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-[#E8A39A] bg-[#FBE4E1] px-3 py-3 text-[15px] font-semibold text-[#8A1C12]">
            <CircleAlert className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
            {actionError}
          </p>
        )}

        <section className={cardCls} aria-labelledby="status-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="status-title" className="text-sm font-semibold text-white/80">
              {t("orderDetail.statusLabel")}
            </h2>
            <StatusChip order={order} size="md" />
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-white">{ta(status.hintKey)}</p>
          {reservationExpiry && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#FDF0D5] px-3 py-2.5 text-sm font-semibold text-[#7A4B00]">
              <Clock3 className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
              {ta("orderDetail.reservedUntil", { time: reservationExpiry })}
            </p>
          )}
          <p className="mt-3 flex items-baseline justify-between gap-3 border-t border-white/15 pt-3">
            <span className="text-sm text-white/80">{t("orderDetail.items.total")}</span>
            <span className="text-xl font-bold text-white">{formatRM(order.total)}</span>
          </p>
        </section>

        {canConfirmReceipt && (
          <section className={`${cardCls} border-2`} aria-labelledby="receive-title">
            <h2 id="receive-title" className="text-lg font-bold text-white">
              {ta("orderDetail.receive.title")}
            </h2>
            <p className="mt-1 text-[15px] leading-relaxed text-white/90">
              {t("orderDetail.confirm.instructions")}
            </p>

            <ol className="mt-3 space-y-2">
              {["farmerPhotos", "yourPhoto", "confirm"].map((key, index) => {
                const done = index < receiveStep;
                const current = index === receiveStep;
                return (
                  <li key={key} className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${current ? "bg-white/15" : ""}`}>
                    <span
                      aria-hidden="true"
                      className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-sm font-bold ${done ? "bg-[#E3C19F] text-[#41362D]" : current ? "border-2 border-[#E3C19F] text-white" : "border-2 border-white/30 text-white/60"}`}
                    >
                      {done ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[15px] font-bold ${done || current ? "text-white" : "text-white/65"}`}>
                        {ta(`orderDetail.receive.steps.${key}.title`)}
                      </span>
                      {current && (
                        <span className="block text-sm leading-relaxed text-white/85">
                          {ta(`orderDetail.receive.steps.${key}.body`)}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>

            {farmerPhotosComplete ? (
              <div className="mt-3">
                {(selectedPreview || order.tracking_photos?.received?.image_url) && (
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewImage({
                        image: selectedPreview || order.tracking_photos?.received?.image_url,
                        alt: t("orderDetail.proofAlt", { stage: t("orderDetail.stages.received") }),
                      })
                    }
                    className="mb-3 block h-44 w-full overflow-hidden rounded-xl bg-black/20"
                    aria-label={ta("orderDetail.proof.open", { stage: t("orderDetail.stages.received") })}
                  >
                    <img
                      src={selectedPreview || order.tracking_photos?.received?.image_url}
                      alt={t("orderDetail.proofAlt", { stage: t("orderDetail.stages.received") })}
                      className="h-full w-full object-contain"
                    />
                  </button>
                )}
                <label
                  htmlFor="received-photo-input"
                  className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#E3C19F] px-3 text-center text-[15px] font-bold text-white"
                >
                  <ImagePlus className="h-5 w-5 flex-none" aria-hidden="true" />
                  <span className="min-w-0 break-all">
                    {receivedFile
                      ? receivedFile.name
                      : receivedProofSaved
                        ? t("orderDetail.confirm.replacePhoto")
                        : t("orderDetail.confirm.uploadPhoto")}
                  </span>
                </label>
                <input
                  id="received-photo-input"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) =>
                    setReceivedFile(event.target.files?.[0] || null)
                  }
                  disabled={actionLoading}
                />
                {receivedProofSaved && !receivedFile && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-[#E3C19F]">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {t("orderDetail.confirm.proofSaved")}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-[#FDF0D5] px-3 py-2.5 text-sm font-semibold leading-relaxed text-[#7A4B00]">
                {t("orderDetail.confirm.waitingFarmerPhotos")}
              </p>
            )}

            <div className="mt-4 border-t border-white/15 pt-3">
              <p className="text-sm text-white/80">{ta("orderDetail.refund.problemPrompt")}</p>
              <button
                type="button"
                onClick={() => {
                  setActionError("");
                  setRefundSheetOpen(true);
                }}
                disabled={actionLoading}
                className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E3C19F]/70 px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                {t("orderDetail.confirm.returnRefund")}
              </button>
            </div>
          </section>
        )}

        <ProgressTimeline order={order} />

        {(isPaid || Object.keys(photos).length > 0) && (
          <OrderTracking
            order={order}
            photos={photos}
            onPreview={(image, alt) => setPreviewImage({ image, alt })}
          />
        )}

        {progressImages.length > 0 && (
          <section className="qurbi-photo-area rounded-2xl border p-4 shadow-sm">
            <h2 className="text-base font-bold text-[#41362D]">{t("orderDetail.progress.title")}</h2>

            <p className="mt-1 text-sm text-[#5A493C]">
              {t("orderDetail.progress.subtitle")}
            </p>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {progressImages.map((image, index) => (
                <button
                  type="button"
                  key={`${image}-${index}`}
                  onClick={() =>
                    setPreviewImage({
                      image,
                      alt: t("orderDetail.progress.photoAlt", { index: index + 1 }),
                    })
                  }
                  className="h-20 w-20 flex-none overflow-hidden rounded-xl bg-[#F7EDE2]"
                >
                  <img
                    src={image}
                    alt={t("orderDetail.progress.photoAlt", { index: index + 1 })}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        {hasRefund && (
          <section className={cardCls} aria-labelledby="refund-title">
            <div className="flex items-center justify-between gap-3">
              <h2 id="refund-title" className="text-base font-bold text-white">
                {t("orderDetail.refundSection.title")}
              </h2>
              <StatusChip order={order} />
            </div>

            {refundReason && (
              <p className="mt-2 text-[15px] text-white/90">
                <span className="font-semibold">{t("orderDetail.refundSection.reasonLabel")}</span>
                {refundReason}
              </p>
            )}

            {refundEvidence.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-semibold text-white/80">
                  {t("orderDetail.refundSection.photoEvidence")}
                </p>

                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {refundEvidence.map((image, index) => (
                    <button
                      type="button"
                      key={image}
                      onClick={() =>
                        setPreviewImage({
                          image,
                          alt: t("orderDetail.refundSection.evidenceAlt", {
                            index: index + 1,
                          }),
                        })
                      }
                      className="h-20 w-20 flex-none overflow-hidden rounded-xl bg-[#F7EDE2]"
                    >
                      <img
                        src={image}
                        alt={t("orderDetail.refundSection.evidenceAlt", {
                          index: index + 1,
                        })}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {refundAdminNote && (
              <p className="mt-2 text-[15px] text-white/90">
                <span className="font-semibold">{t("orderDetail.refundSection.adminNoteLabel")}</span>
                {refundAdminNote}
              </p>
            )}

            <p className={`mt-2 text-sm font-semibold ${isRefundRejected ? "text-[#F6B7AE]" : "text-[#E3C19F]"}`}>
              {ta(status.hintKey)}
            </p>

            {(refundStatus === "pending_admin_approval" || refundStatus === "requested") && (
              <p className="mt-1 text-sm text-white/80">
                {t("orderDetail.refundSection.waitingAdminReview")}
              </p>
            )}
          </section>
        )}

        <section className={cardCls} aria-labelledby="items-title">
          <h2 id="items-title" className="mb-1 text-base font-bold text-white">
            {t("orderDetail.items.title")}
          </h2>

          {order.items?.map((item, index) => (
            <div
              key={item.id || index}
              className="flex items-center gap-3 border-b border-white/15 py-3 last:border-0"
            >
              <ItemImage src={item.image} />
              <div className="min-w-0 flex-1">
                <p className="break-words text-[15px] font-semibold text-white">
                  {item.breed || item.listing_name || t("orders.fallbackItemName")}
                </p>
                <p className="mt-0.5 text-[13px] text-white/75">
                  {item.quantity} × {formatRM(item.price_per_head)}
                  {item.animal ? ` · ${item.animal}` : ""}
                  {item.grade
                    ? t("orderDetail.items.gradeSuffix", { grade: item.grade })
                    : ""}
                </p>
              </div>
              <p className="whitespace-nowrap text-[15px] font-bold text-white">
                {formatRM(item.total)}
              </p>
            </div>
          ))}

          <dl className="mt-1 space-y-1.5 border-t border-white/25 pt-3 text-[15px]">
            {Number(order.subtotal) > 0 && Number(order.subtotal) !== Number(order.total) && (
              <div className="flex justify-between text-white/85">
                <dt>{ta("orderDetail.summary.subtotal")}</dt>
                <dd>{formatRM(order.subtotal)}</dd>
              </div>
            )}
            {Number(order.delivery_fee) > 0 && (
              <div className="flex justify-between text-white/85">
                <dt>{ta("orderDetail.summary.delivery")}</dt>
                <dd>{formatRM(order.delivery_fee)}</dd>
              </div>
            )}
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-white/85">
                <dt>{ta("orderDetail.summary.discount")}</dt>
                <dd>− {formatRM(order.discount)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between">
              <dt className="font-bold text-white">{t("orderDetail.items.total")}</dt>
              <dd className="text-xl font-bold text-white">{formatRM(order.total)}</dd>
            </div>
          </dl>
        </section>

        <DeliveryCard order={order} />

      </main>

      {stickyAction && <StickyActionBar>{stickyAction}</StickyActionBar>}

      <RefundRequestSheet
        order={refundSheetOpen ? order : null}
        loading={actionLoading}
        error={actionError}
        onClose={() => {
          setActionError("");
          setRefundSheetOpen(false);
        }}
        onSubmit={requestRefund}
      />

      <ImageLightbox
        image={previewImage?.image}
        alt={previewImage?.alt}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}
