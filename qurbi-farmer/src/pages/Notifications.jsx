import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { qurbi } from "@/api/qurbiClient";
import { Bell, CheckCheck, CheckCircle2, ChevronRight, Loader2, PackageCheck, ShieldAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/agri/EmptyState";
import { formatDateTime, formatRelative } from "@/lib/agri";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [marking, setMarking] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError("");
    qurbi.entities.FarmerNotification.list("-created_date", 200)
      .then((rows) => setItems(rows || []))
      .catch((error) => setLoadError(error?.message || "Notifications could not be loaded."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    qurbi.functions.invoke("syncFarmerNotifications")
      .catch(() => null)
      .finally(() => load());
    const unsubscribe = qurbi.entities.FarmerNotification.subscribe(() => load());
    return unsubscribe;
  }, []);

  const openNotification = async (notification) => {
    if (!notification.isRead) {
      setItems((current) => current.map((item) => item.id === notification.id ? { ...item, isRead: true } : item));
      await qurbi.entities.FarmerNotification.update(notification.id, { isRead: true }).catch(() => null);
    }
    if (notification.orderId) navigate(`/orders/${notification.orderId}`);
    else if (notification.livestockId) navigate(`/livestock/${notification.livestockId}`);
  };

  const markAllRead = async () => {
    const unread = items.filter((item) => !item.isRead);
    if (!unread.length) return;
    setMarking(true);
    try {
      await Promise.all(unread.map((item) => qurbi.entities.FarmerNotification.update(item.id, { isRead: true })));
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    } finally {
      setMarking(false);
    }
  };

  const unreadCount = items.filter((item) => !item.isRead).length;

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight lg:text-3xl">Notifications</h1>
          <p className="text-sm text-muted-foreground">{unreadCount ? `${unreadCount} new update${unreadCount === 1 ? "" : "s"}` : "You're all caught up"}</p>
        </div>
        <Button variant="outline" onClick={markAllRead} disabled={!unreadCount || marking} className="h-11 shrink-0 rounded-2xl px-3">
          {marking ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-1.5 h-4 w-4" />} Mark all read
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        {loadError && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
            <span>{loadError}</span>
            <button type="button" onClick={load} className="min-h-11 shrink-0 rounded-xl bg-card px-3 font-bold">Retry</button>
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : items.length ? items.map((notification) => {
          const approved = notification.type?.includes("Approved");
          const rejected = notification.type?.includes("Rejected");
          const newOrder = notification.type === "New Order";
          const important = notification.priority === "Important" || notification.type === "Refund Requested";
          const Icon = important ? ShieldAlert : newOrder ? PackageCheck : approved ? CheckCircle2 : rejected ? XCircle : Bell;
          const linked = Boolean(notification.orderId || notification.livestockId);
          return (
            <button
              key={notification.id}
              type="button"
              onClick={() => openNotification(notification)}
              className={cn(
                "relative flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                important ? "border-destructive/40 bg-destructive/5" : notification.isRead ? "border-border bg-card" : "border-primary/30 bg-card shadow-[0_4px_14px_rgba(65,54,45,0.08)]"
              )}
            >
              {!notification.isRead && <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-primary" aria-hidden="true" />}
              <span className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                important || rejected ? "bg-destructive/10 text-destructive" : newOrder ? "bg-sky-100 text-sky-800" : approved ? "bg-emerald-100 text-emerald-800" : "bg-secondary/70 text-primary"
              )}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className={cn("text-base text-foreground", notification.isRead ? "font-semibold" : "font-extrabold")}>{notification.title}</span>
                  {important && <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-destructive-foreground">IMPORTANT</span>}
                  {!notification.isRead && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">New</span>}
                </span>
                <span className="mt-1 block whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{notification.message}</span>
                <span className="mt-2 block text-sm text-muted-foreground" title={formatDateTime(notification.created_date)}>{formatRelative(notification.created_date) || formatDateTime(notification.created_date)}{linked ? " · Tap to open" : ""}</span>
              </span>
              {linked && <ChevronRight className="mt-3 h-5 w-5 shrink-0 text-muted-foreground" />}
            </button>
          );
        }) : !loadError ? (
          <EmptyState icon={Bell} title="No notifications yet" description="New orders, verification results and listing updates will show up here." />
        ) : null}
      </div>
    </div>
  );
}
