import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, CheckCircle2, X, XCircle } from "lucide-react";

const TYPE_STYLE = {
  farmer_photo: {
    icon: Camera,
    iconClass: "bg-[#E3C19F] text-[#41362D]",
  },
  refund_approved: {
    icon: CheckCircle2,
    iconClass: "bg-[#E3C19F] text-[#41362D]",
  },
  refund_rejected: {
    icon: XCircle,
    iconClass: "bg-red-100 text-red-700",
  },
};

export default function NotificationBanner({ notification, onOpen, onClose }) {
  const { t } = useTranslation("orders");
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    setClosing(false);
    const closeTimer = window.setTimeout(() => setClosing(true), 5000);
    return () => {
      window.clearTimeout(closeTimer);
    };
  }, [notification.id]);

  useEffect(() => {
    if (!closing) return undefined;
    const removeTimer = window.setTimeout(onClose, 350);
    return () => window.clearTimeout(removeTimer);
  }, [closing, onClose]);

  const style = TYPE_STYLE[notification.type] || TYPE_STYLE.farmer_photo;
  const Icon = style.icon;

  return (
    <aside
      className={`fixed left-4 right-4 top-[calc(env(safe-area-inset-top)+0.5rem)] z-[70] mx-auto max-w-md ${closing ? "animate-notification-banner-out" : "animate-notification-banner-in"}`}
      role="status"
      aria-live="polite"
    >
      <div className="relative overflow-hidden rounded-2xl border border-[#41362D]/15 bg-[#FFFDF9]/95 shadow-lg shadow-[#41362D]/15 backdrop-blur-md">
        <span className="absolute inset-y-0 left-0 w-1 bg-[#5A493C]/80" />
        <button
          type="button"
          onClick={() => onOpen(notification)}
          className="flex min-h-[64px] w-full items-center gap-3 px-4 py-3 pr-14 text-left active:bg-[#F7EDE2]/70"
        >
          <span
            className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ${style.iconClass}`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-[#41362D]">
              {notification.title}
            </span>
            <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-[#41362D]/80">
              {notification.message}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setClosing(true)}
          aria-label={t("notificationBanner.dismissAria")}
          className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[#41362D]/70 transition-colors active:bg-[#E3C19F]/40"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}
