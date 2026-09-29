import React, { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useNotifications } from "@/lib/notification-context";
import {
  formatOrderTime,
  orderDateKey,
  orderDayHeading,
  orderTimestamp,
} from "@/lib/order-date";
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
    iconClass: "bg-red-100 text-red-700",
  },
};

function SwipeableNotificationRow({
  notification,
  opening,
  clearing,
  onOpen,
  onClear,
}) {
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

  return (
    <div className="notification-delete-surface relative isolate overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => onClear(notification.id)}
        disabled={clearing}
        aria-label={`Clear ${notification.title}`}
        className="notification-delete-surface absolute inset-y-0 right-0 z-0 flex h-full w-[76px] flex-col items-center justify-center gap-1 rounded-r-2xl text-[10px] font-bold text-white disabled:opacity-60"
      >
        <Trash2 className="h-5 w-5" />
        {clearing ? "Clearing…" : "Clear"}
      </button>
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
        className={`qurbi-dark-surface relative z-10 flex w-full touch-pan-y items-center gap-3 rounded-2xl border bg-[#41362D] px-4 py-4 text-left shadow-sm transition-transform duration-300 ease-out will-change-transform ${notification.is_read ? "brightness-90" : "brightness-100"}`}
        style={{ transform: revealed ? "translateX(-76px)" : "translateX(0)" }}
      >
        {!notification.is_read && (
          <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
        )}
        <span
          className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ${style.iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1 pr-3">
          <span className="block text-sm font-bold text-white">
            {notification.title}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-white/80">
            {notification.message}
          </span>
          <span className="mt-1.5 block text-[11px] font-semibold text-white/60">
            {formatOrderTime(notification.event_at)}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 flex-none text-white/50" />
      </button>
    </div>
  );
}

export default function Notifications() {
  const { navigateFromIconPage } = useHeaderTransition();
  const { authChecked, isAuthenticated } = useAuth();
  const {
    notifications,
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
          label: orderDayHeading(notification.event_at),
          notifications: [],
        });
      }
      grouped.get(key).notifications.push(notification);
    }
    return [...grouped.values()];
  }, [notifications]);

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
    return <AuthRequiredState title="Notifications" message="Sign in to view your order notifications." returnTo="/notifications" />;
  }

  return (
    <main className="aisyah-page min-h-screen px-4 pb-28 pt-[max(2rem,env(safe-area-inset-top))] sm:px-6">
      <section className="mx-auto max-w-3xl">
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={() => navigateFromIconPage(-1)}
              aria-label="Go back"
              className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-[#F7EDE2]/60 bg-gradient-to-br from-[#41362D] to-[#6B594A] text-white transition-transform active:scale-90"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div className="min-w-0">
              <p className="text-[15px] font-bold uppercase tracking-[0.5em] text-[#41362D]/55">
                QURBI
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[#41362D]">
                Notifications
              </h1>
            </div>
          </div>
          <div className="flex flex-none items-center justify-end gap-2 self-end sm:self-auto">
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearAll(true)}
                className="min-h-11 rounded-xl border border-[#41362D]/20 bg-white/65 px-3 text-xs font-bold text-white active:scale-95"
              >
                Clear All
              </button>
            )}
            <button
              type="button"
              onClick={() => refreshNotifications()}
              disabled={loading}
              aria-label="Refresh notifications"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#41362D]/20 bg-white/65 text-white transition-transform active:scale-90 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && !notifications.length ? (
          <div className="mt-7">
            <AisyahCardSkeleton count={4} variant="list" />
          </div>
        ) : !groups.length ? (
          <div className="mt-8 rounded-3xl border border-[#41362D]/15 bg-white/55 px-6 py-14 text-center shadow-sm">
            <Bell className="mx-auto h-10 w-10 text-[#41362D]/30" />
            <h2 className="mt-4 font-bold text-[#41362D]">
              No notifications yet
            </h2>
            <p className="mt-1 text-sm text-[#41362D]/60">
              Farmer photo and refund updates will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-7 space-y-7 animate-content-ready">
            {groups.map((group) => (
              <section key={group.key}>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#41362D]/60">
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
          <div className="w-full max-w-sm rounded-3xl border border-[#41362D]/15 bg-[#FFFDF9] p-5 text-center shadow-2xl">
            <h2
              id="clear-notifications-title"
              className="mt-4 text-lg font-bold text-[#41362D]"
            >
              Clear all notifications?
            </h2>
            <p className="mt-2 text-sm text-[#41362D]/65">
              This only clears notifications from your account.
            </p>
            <button
              type="button"
              onClick={clearAll}
              disabled={clearingAll}
              className="mt-5 min-h-12 w-full rounded-xl bg-red-500 font-bold text-white disabled:opacity-60"
            >
              {clearingAll ? "Clearing…" : "Clear All"}
            </button>
            <button
              type="button"
              onClick={() => setShowClearAll(false)}
              disabled={clearingAll}
              className="mt-2 min-h-12 w-full rounded-xl bg-[#F7EDE2] font-bold text-[#41362D] disabled:opacity-60"
            >
              Keep Notifications
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
