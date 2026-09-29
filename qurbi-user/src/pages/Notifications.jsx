import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Megaphone,
  RefreshCw,
  Trash2,
  Truck,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useNotifications } from "@/lib/notification-context";
import { orderDateKey, orderTimestamp } from "@/lib/order-date";
import { dayHeading, timeOnly } from "@/components/account/dates";
import { dangerBtn, secondaryBtn } from "@/components/account/buttons";
import { AisyahCardSkeleton } from "@/components/AisyahLoading";
import { useHeaderTransition } from "@/components/HeaderTransitionProvider";
import AuthRequiredState from "@/components/AuthRequiredState";

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
    iconClass: "bg-[#FBE4E1] text-[#8A1C12]",
  },
  payment: {
    icon: CreditCard,
    iconClass: "bg-[#FDF0D5] text-[#7A4B00]",
  },
  delivery: {
    icon: Truck,
    iconClass: "bg-[#E3C19F] text-[#41362D]",
  },
  promotion: {
    icon: Megaphone,
    iconClass: "bg-[#E3C19F] text-[#41362D]",
  },
  general: {
    icon: Bell,
    iconClass: "bg-[#E3C19F] text-[#41362D]",
  },
};

/**
 * The API returns notifications in backend shape (createdAt, body, isRead,
 * linkUrl); older code expects event_at/message/is_read/order_id. Accept both.
 * @param {any} raw
 */
function normalizeNotification(raw) {
  const link = typeof raw.linkUrl === "string" ? raw.linkUrl : raw.link_url || "";
  const orderFromLink = link.match(/^\/orders\/([^/?#]+)/)?.[1] || "";
  return {
    ...raw,
    event_at: raw.event_at || raw.createdAt || raw.created_at || raw.created_date || null,
    message: raw.message ?? raw.body ?? "",
    is_read: Boolean(raw.is_read ?? raw.isRead),
    order_id: raw.order_id || raw.orderId || (orderFromLink ? decodeURIComponent(orderFromLink) : ""),
    link_url: link,
  };
}

function SwipeableNotificationRow({
  notification,
  opening,
  clearing,
  onOpen,
  onClear,
}) {
  const { t } = useTranslation("orders");
  const { t: ta } = useTranslation("account");
  const [revealed, setRevealed] = useState(false);
  const touchStart = useRef(null);
  const didSwipe = useRef(false);
  const style = TYPE_STYLE[notification.type] || TYPE_STYLE.farmer_photo;
  const Icon = style.icon;

  const onTouchEnd = (event) => {
    if (touchStart.current == null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStart.current;
    const distance = endX - touchStart.current;
    didSwipe.current = Math.abs(distance) > 18;
    if (distance < -42) setRevealed(true);
    if (distance > 32) setRevealed(false);
    touchStart.current = null;
  };

  const unread = !notification.is_read;
  const openable = Boolean(notification.order_id || notification.link_url);

  return (
    <div className={`relative isolate overflow-hidden rounded-2xl ${revealed ? "notification-delete-surface" : ""}`}>
      <button
        type="button"
        onClick={() => onClear(notification.id)}
        disabled={clearing}
        tabIndex={revealed ? 0 : -1}
        aria-hidden={!revealed}
        className="notification-delete-surface absolute inset-y-0 right-0 z-0 flex h-full w-[76px] flex-col items-center justify-center gap-1 rounded-r-2xl text-xs font-bold text-white disabled:opacity-60"
      >
        <Trash2 className="h-5 w-5" />
        {clearing ? t("notifications.clearing") : t("notifications.clear")}
      </button>
      <div
        className="relative z-10 transition-transform duration-300 ease-out will-change-transform"
        style={{ transform: revealed ? "translateX(-76px)" : "translateX(0)" }}
      >
        <button
          type="button"
          onTouchStart={(event) => {
            touchStart.current = event.touches[0]?.clientX ?? null;
            didSwipe.current = false;
          }}
          onTouchEnd={onTouchEnd}
          onClick={() => {
            if (didSwipe.current) {
              didSwipe.current = false;
              return;
            }
            if (revealed) setRevealed(false);
            else onOpen(notification);
          }}
          disabled={opening || clearing}
          aria-label={`${unread ? ta("notifications.unreadPrefix") : ""}${notification.title}`}
          className={`flex min-h-[76px] w-full touch-pan-y items-start gap-3 rounded-2xl border-2 py-3.5 pl-4 pr-14 text-left shadow-sm ${unread ? "qurbi-dark-surface border-[#E3C19F]" : "border-[#E3C19F] bg-[#FFFDF9]"}`}
        >
          <span
            className={`relative flex h-11 w-11 flex-none items-center justify-center rounded-xl ${style.iconClass}`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {unread && (
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#D92D20] ring-2 ring-[#41362D]" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className={`break-words text-[15px] leading-snug ${unread ? "font-bold text-white" : "font-semibold text-[#41362D]"}`}>
                {notification.title}
              </span>
              {unread && (
                <span className="rounded-full bg-[#E3C19F] px-2 py-0.5 text-[11px] font-bold text-[#41362D]">
                  {ta("notifications.new")}
                </span>
              )}
            </span>
            {notification.message && (
              <span className={`mt-1 block break-words text-sm leading-relaxed ${unread ? "text-white/90" : "text-[#5A493C]"}`}>
                {notification.message}
              </span>
            )}
            <span className={`mt-1.5 flex items-center gap-1 text-[13px] font-semibold ${unread ? "text-white/75" : "text-[#6B594A]"}`}>
              {timeOnly(notification.event_at, ta)}
              {openable && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className={unread ? "text-[#E3C19F]" : "text-[#41362D]"}>{ta("notifications.viewOrder")}</span>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onClear(notification.id)}
          disabled={clearing || opening}
          aria-label={t("notifications.clearAria", { title: notification.title })}
          className={`absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-50 ${unread ? "text-white/80 hover:bg-[#FFFFFF]/10" : "text-[#6B594A] hover:bg-[#F7EDE2]"}`}
        >
          <Trash2 className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}

export default function Notifications() {
  const { t } = useTranslation("orders");
  const { t: ta } = useTranslation("account");
  const { navigateFromIconPage } = useHeaderTransition();
  const { authChecked, isAuthenticated } = useAuth();
  const {
    notifications: rawNotifications,
    loading,
    error,
    refreshNotifications,
    markAsRead,
    clearNotification,
    clearAllNotifications,
  } = useNotifications();
  const [openingId, setOpeningId] = useState("");
  const [clearingId, setClearingId] = useState("");
  const [showClearAll, setShowClearAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const notifications = useMemo(
    () => rawNotifications.map(normalizeNotification),
    [rawNotifications],
  );
  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const groups = useMemo(() => {
    const sorted = [...notifications].sort(
      (a, b) => orderTimestamp(b.event_at) - orderTimestamp(a.event_at),
    );
    const grouped = new Map();
    for (const notification of sorted) {
      const key = orderDateKey(notification.event_at);
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          label: dayHeading(notification.event_at, ta),
          notifications: [],
        });
      }
      grouped.get(key).notifications.push(notification);
    }
    return [...grouped.values()];
  }, [notifications, ta]);

  const openNotification = async (notification) => {
    if (openingId) return;
    setOpeningId(notification.id);
    try {
      const readSaved = notification.is_read
        ? true
        : await markAsRead(notification.id);
      if (!readSaved) return;
      if (notification.order_id) {
        navigateFromIconPage(
          `/orders/${encodeURIComponent(notification.order_id)}`,
        );
      } else if (notification.link_url?.startsWith("/") && !notification.link_url.startsWith("//")) {
        navigateFromIconPage(notification.link_url);
      }
    } finally {
      setOpeningId("");
    }
  };

  const clearOne = async (notificationId) => {
    if (clearingId || clearingAll) return;
    setClearingId(notificationId);
    await clearNotification(notificationId);
    setClearingId("");
  };

  const clearAll = async () => {
    if (clearingAll) return;
    setClearingAll(true);
    const cleared = await clearAllNotifications();
    setClearingAll(false);
    if (cleared) setShowClearAll(false);
  };

  if (authChecked && !isAuthenticated) {
    return (
      <AuthRequiredState
        title={t("notifications.title")}
        message={t("notifications.signInPrompt")}
        returnTo="/notifications"
      />
    );
  }

  return (
    <main className="aisyah-page min-h-screen px-4 pt-[max(2rem,env(safe-area-inset-top))] sm:px-6">
      <section className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigateFromIconPage(-1)}
            aria-label={t("notifications.goBackAria")}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-[#F7EDE2]/60 bg-gradient-to-br from-[#41362D] to-[#6B594A] text-white transition-transform active:scale-90"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-[#41362D]/70">
              QURBI
            </p>
            <h1 className="text-2xl font-bold leading-tight text-[#41362D]">
              {t("notifications.title")}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => refreshNotifications()}
            disabled={loading}
            aria-label={t("notifications.refreshAria")}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border-2 border-[#6B594A] text-[#41362D] transition-transform active:scale-90 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {notifications.length > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[15px] font-semibold text-[#41362D]" aria-live="polite">
              {unreadCount > 0
                ? ta("notifications.unreadCount", { count: unreadCount })
                : ta("notifications.allRead")}
            </p>
            <button
              type="button"
              onClick={() => setShowClearAll(true)}
              className="min-h-11 flex-none rounded-xl px-3 text-sm font-bold text-[#41362D] underline underline-offset-4"
            >
              {t("notifications.clearAll")}
            </button>
          </div>
        )}

        {error && (
          <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E8A39A] bg-[#FBE4E1] px-4 py-3 text-sm font-semibold text-[#8A1C12]">
            <span>{error}</span>
            <button type="button" onClick={() => refreshNotifications()} className="min-h-11 rounded-lg px-2 font-bold underline">
              {ta("notifications.retry")}
            </button>
          </div>
        )}

        {loading && !notifications.length ? (
          <div className="mt-6">
            <AisyahCardSkeleton count={4} variant="list" />
          </div>
        ) : !groups.length ? (
          <div className="mt-8 rounded-3xl border border-[#E3C19F] bg-[#FFFDF9]/80 px-6 py-12 text-center shadow-sm">
            <Bell className="mx-auto h-10 w-10 text-[#6B594A]" aria-hidden="true" />
            <h2 className="mt-4 text-base font-bold text-[#41362D]">
              {t("notifications.emptyTitle")}
            </h2>
            <p className="mx-auto mt-1 max-w-xs text-[15px] text-[#41362D]/75">
              {t("notifications.emptyBody")}
            </p>
            <button
              type="button"
              onClick={() => navigateFromIconPage("/orders")}
              className={`${secondaryBtn} mt-5 px-6`}
            >
              {ta("notifications.goToOrders")}
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-6 animate-content-ready">
            {groups.map((group) => (
              <section key={group.key} aria-label={group.label}>
                <h2 className="mb-2.5 px-1 text-sm font-bold text-[#41362D]/80">
                  {group.label}
                </h2>
                <div className="space-y-3">
                  {group.notifications.map((notification) => (
                    <SwipeableNotificationRow
                      key={notification.id}
                      notification={notification}
                      opening={openingId === notification.id}
                      clearing={clearingId === notification.id}
                      onOpen={openNotification}
                      onClear={clearOne}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
      {showClearAll && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-notifications-title"
        >
          <div className="w-full max-w-sm rounded-3xl border border-[#E3C19F] bg-[#FFFDF9] p-5 text-center shadow-2xl">
            <h2
              id="clear-notifications-title"
              className="text-lg font-bold text-[#41362D]"
            >
              {t("notifications.clearAllModal.title")}
            </h2>
            <p className="mt-2 text-[15px] text-[#5A493C]">
              {t("notifications.clearAllModal.body")}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowClearAll(false)}
                disabled={clearingAll}
                className={secondaryBtn}
              >
                {t("notifications.clearAllModal.keep")}
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={clearingAll}
                className={dangerBtn}
              >
                {clearingAll ? t("notifications.clearing") : t("notifications.clearAll")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
