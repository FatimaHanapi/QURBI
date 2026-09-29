import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { CircleAlert, X } from "lucide-react";

export default function PaymentErrorModal({ error, onClose, onViewOrders }) {
  useEffect(() => {
    if (!error) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [error, onClose]);

  if (!error) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="payment-error-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-[#E3C19F]/60 bg-gradient-to-br from-[#41362D] to-[#6B594A] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#E3C19F]/25 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-[#E3C19F] bg-white/10">
              <CircleAlert className="h-6 w-6 text-[#E3C19F]" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E3C19F]/80">
                Payment update
              </p>
              <h2 id="payment-error-title" className="mt-0.5 text-lg font-bold text-white">
                {error.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment message"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-[#E3C19F]/60 text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <p className="rounded-2xl border border-[#E3C19F] bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] p-4 text-sm font-semibold leading-relaxed text-[#41362D]">
            {error.message}
          </p>
          {error.reserved && (
            <p className="mt-3 text-sm leading-relaxed text-white">
              Your livestock remains reserved for up to 24 hours. You can try payment again from My Orders.
            </p>
          )}
          <div className={`mt-5 grid gap-3 ${error.reserved ? "grid-cols-2" : "grid-cols-1"}`}>
            {error.reserved && (
              <button
                type="button"
                onClick={onViewOrders}
                className="min-h-12 rounded-xl border border-[#E3C19F] text-sm font-bold text-white"
              >
                My Orders
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 rounded-xl border border-[#41362D] bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] text-sm font-bold text-[#41362D]"
            >
              {error.reserved ? "Try Again" : "Okay"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
