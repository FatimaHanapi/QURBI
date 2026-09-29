import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { qurbi } from "@/api/qurbiClient";
import { Bell, CheckCheck, CheckCircle2, ChevronRight, Loader2, PackageCheck, ShieldAlert, XCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PREVIEW_LIMIT = 5;

function relativeTime(value) {
  if (!value) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}

function notificationStyle(notification) {
  if (notification.priority === "Important" || notification.type === "Refund Requested") {
    return { Icon: ShieldAlert, className: "bg-destructive/10 text-destructive" };
  }
  if (notification.type === "New Order") {
    return { Icon: PackageCheck, className: "bg-sky-100 text-sky-700" };
  }
  if (notification.type?.includes("Approved")) {
    return { Icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700" };
  }
  if (notification.type?.includes("Rejected")) {
    return { Icon: XCircle, className: "bg-destructive/10 text-destructive" };
  }
  return { Icon: Bell, className: "bg-primary/10 text-primary" };
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = (showLoader = false) => {
    if (showLoader) setLoading(true);
    return qurbi.entities.FarmerNotification.list("-created_date", 50)
      .then((rows) => setItems(rows || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    qurbi.functions.invoke("syncFarmerNotifications")
      .catch(() => null)
      .finally(() => load(true));
    const unsubscribe = qurbi.entities.FarmerNotification.subscribe(() => load());
    return unsubscribe;
  }, []);

  const unreadCount = items.filter((item) => !item.isRead).length;
  const previews = items.slice(0, PREVIEW_LIMIT);

  const openNotification = async (notification) => {
    if (!notification.isRead) {
      setItems((current) => current.map((item) => item.id === notification.id ? { ...item, isRead: true } : item));
      try {
        await qurbi.entities.FarmerNotification.update(notification.id, { isRead: true });
      } catch {
        load();
        return;
      }
    }
    setOpen(false);
    if (notification.orderId) navigate(`/orders/${notification.orderId}`);
    else if (notification.livestockId) navigate(`/livestock/${notification.livestockId}`);
    else navigate("/notifications");
  };

  const markAllRead = async () => {
    const unread = items.filter((item) => !item.isRead);
    if (!unread.length || marking) return;
    setMarking(true);
    try {
      await Promise.all(unread.map((item) => qurbi.entities.FarmerNotification.update(item.id, { isRead: true })));
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    } finally {
      setMarking(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-destructive px-1 text-xs font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        collisionPadding={12}
        className="w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border-border bg-card p-0 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
          <div>
            <h2 className="font-extrabold tracking-tight">Notifications</h2>
            <p className="text-sm text-muted-foreground">{unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "You're all caught up"}</p>
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={!unreadCount || marking}
            className="flex items-center gap-1.5 min-h-10 rounded-full px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-default disabled:opacity-40"
          >
            {marking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
            Mark all read
          </button>
        </div>

        <div className="max-h-[min(25rem,60vh)] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : previews.length ? previews.map((notification) => {
            const { Icon, className } = notificationStyle(notification);
            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => openNotification(notification)}
                className={cn(
                  "group flex w-full items-start gap-3 border-b border-border/70 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/60",
                  !notification.isRead && "bg-primary/[0.045]"
                )}
              >
                <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", className)}><Icon className="h-[18px] w-[18px]" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start gap-2">
                    <span className="line-clamp-1 flex-1 text-sm font-bold text-foreground">{notification.title}</span>
                    {notification.priority === "Important" && <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-destructive-foreground">IMPORTANT</span>}
                    {!notification.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{notification.message}</span>
                  <span className="mt-1.5 block text-xs font-medium text-muted-foreground">{relativeTime(notification.created_date)}</span>
                </span>
                <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          }) : (
            <div className="px-6 py-10 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Bell className="h-5 w-5" /></span>
              <p className="mt-3 text-sm font-bold">No notifications yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Farmer and listing updates will appear here.</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => { setOpen(false); navigate("/notifications"); }}
          className="flex w-full items-center justify-center gap-1 border-t border-border bg-muted/30 px-4 py-3 text-xs font-bold text-primary transition-colors hover:bg-muted"
        >
          View all notifications <ChevronRight className="h-4 w-4" />
        </button>
      </PopoverContent>
    </Popover>
  );
}
