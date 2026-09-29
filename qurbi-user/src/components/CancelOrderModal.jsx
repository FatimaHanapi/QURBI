import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, X } from "lucide-react";
import { formatRM } from "@/lib/format";

export default function CancelOrderModal({ order, loading, error, onConfirm, onClose }) {
  const { t } = useTranslation("cart");
  const firstItem = order?.items?.[0];
  const orderDisplayName = firstItem?.breed || firstItem?.listing_name || firstItem?.animal || order?.order_number || t("cancelOrderModal.orderFallback");
  useEffect(() => {
    if (!order) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [loading, onClose, order]);

  if (!order) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-order-title"
      onClick={() => !loading && onClose()}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-[#F7EDE2]/40 bg-gradient-to-br from-[#41362D] to-[#6B594A] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#F7EDE2]/20 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-[#F7EDE2]/50 bg-white/10">
              <AlertTriangle className="h-5 w-5 text-[#F7EDE2]" />
            </div>
            <div className="min-w-0">
              <h2 id="cancel-order-title" className="text-lg font-bold text-white">
                {t("cancelOrderModal.heading")}
              </h2>
              <p className="mt-0.5 break-words text-sm text-white/85">
                {orderDisplayName} · {formatRM(order.total)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label={t("cancelOrderModal.closeDialog")}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-[#F7EDE2]/60 text-white disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <p className="rounded-2xl border border-[#41362D]/30 bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] p-4 text-sm leading-relaxed text-[#41362D]">
            {t("cancelOrderModal.warningMessage")}
          </p>
          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-[#FBE4E1] p-3 text-center text-sm font-semibold text-[#8A1C12]">
              {error}
            </p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="min-h-12 rounded-xl border border-[#F7EDE2] text-sm font-bold text-white disabled:opacity-50"
            >
              {t("cancelOrderModal.keepOrderButton")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="min-h-12 rounded-xl bg-[#B42318] text-sm font-bold text-white shadow-sm disabled:opacity-50"
            >
              {loading ? t("cancelOrderModal.cancelling") : t("cancelOrderModal.cancelOrderButton")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
