import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { qurbi } from "@/api/qurbiClient";
import { useAuth } from "@/lib/AuthContext";
import { AlertTriangle, BadgeCheck, Boxes, Camera, ChevronRight, Clock, PackageCheck, Plus, ShoppingBag, TrendingUp } from "lucide-react";
import EmptyState from "@/components/agri/EmptyState";
import BrandLogo from "@/components/agri/BrandLogo";
import FeaturedListingsCarousel from "@/components/agri/FeaturedListingsCarousel";
import NotificationBell from "@/components/agri/NotificationBell";
import SectionHeader from "@/components/agri/SectionHeader";
import StatusBadge from "@/components/agri/StatusBadge";
import { Image } from "@/components/ui/image";
import { displayName, farmStats, formatMYR, greeting, initials, listingExpiry, orderItemTitle, orderStatusMeta, shortName, userVal } from "@/lib/agri";
import { reconcileOrderLivestockStatuses } from "@/lib/orderLivestockStatus";
import CowSilhouetteIcon from "@/components/agri/CowSilhouetteIcon";
import { refreshExpiredReservations } from "@/lib/livestockReservation";
import { cn } from "@/lib/utils";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [livestock, setLivestock] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        // Keep order reconciliation before livestock statistics so Sold/Available remains current.
        const orderResponse = await qurbi.functions.invoke("fetchFarmerOrders", {});
        const nextOrders = orderResponse.data?.orders;
        if (!Array.isArray(nextOrders)) throw new Error("The order service returned an invalid response.");
        const storedLivestock = await refreshExpiredReservations(
          await qurbi.entities.Livestock.list("-created_date", 500),
        );
        // Status sync is best-effort: if the backend refuses an update (e.g. SOLD can only be
        // set by a purchase) the dashboard still shows the real orders and listings.
        const nextLivestock = await reconcileOrderLivestockStatuses(nextOrders, storedLivestock)
          .catch((syncError) => { console.warn("Livestock status sync skipped:", syncError?.message); return storedLivestock; });
        if (!mounted) return;
        setLivestock(nextLivestock || []);
        setOrders(nextOrders);
        setLoadError("");
      } catch (error) {
        console.error("Failed to refresh home data:", error);
        if (mounted) setLoadError("We couldn't refresh your dashboard. Showing the latest information we have.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    window.addEventListener("focus", fetchData);
    return () => { mounted = false; window.removeEventListener("focus", fetchData); };
  }, []);

  const fullName = displayName(user);
  const stats = farmStats(orders, livestock);
  const expiredCount = livestock.filter((item) => item.status === "Available" && listingExpiry(item).expired).length;
  const ordersToHandle = orders.filter((order) => orderStatusMeta(order.status).group === "action");
  const forSale = livestock.filter((item) => item.status === "Available" && !listingExpiry(item).expired).slice(0, 5);
  const recentOrders = orders.slice(0, 4);

  return (
    <div className="animate-fade-in">
      <section className="home-brand-hero -mx-5 -mt-5 px-5 pb-10 pt-4 text-white lg:mx-0 lg:mt-0 lg:rounded-[1.75rem] lg:px-8 lg:pb-12 lg:pt-5">
        <header
          className="relative z-10 flex min-h-12 items-center justify-between"
          aria-label="QURBI Farmer header"
        >
          <BrandLogo
            light
            className="[&>div:first-child]:bg-secondary [&>div:first-child]:text-secondary-foreground"
          />
          <div className="flex gap-2 [&_button]:border-white/15 [&_button]:bg-white/10 [&_button]:text-white [&_button]:shadow-none [&_button:hover]:bg-white/20">
            <NotificationBell />
            <button
              type="button"
              onClick={() => navigate("/profile")}
              aria-label="Open farmer profile"
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-secondary/70 bg-secondary font-extrabold text-secondary-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {userVal(user, "profilePhoto") ? (
                <Image
                  src={userVal(user, "profilePhoto")}
                  fittingType="fill"
                  alt="Farmer profile"
                  className="h-full w-full"
                />
              ) : (
                initials(fullName)
              )}
            </button>
          </div>
        </header>
        <div className="relative z-10 mt-6 min-w-0">
          <p className="text-base font-medium text-white/80">{greeting()},</p>
          <h1 className="truncate text-2xl font-extrabold tracking-tight lg:text-3xl" title={fullName}>{shortName(fullName) || fullName}</h1>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-secondary ring-1 ring-white/15 backdrop-blur"><BadgeCheck className="h-4 w-4" /> Verified Farmer</span>
        </div>
      </section>

      <div className="relative z-20 -mx-5 -mt-6 lg:mx-0">
        <div className="rounded-t-[2rem] border-b border-border/60 bg-card px-4 pb-4 pt-5 shadow-[0_-8px_24px_rgba(65,54,45,0.08)] sm:px-6 lg:rounded-[2rem]">
          <div className="grid grid-cols-4 gap-1.5">
            <QuickAction icon={Plus} label="Add animal" onClick={() => navigate("/livestock/add")} primary />
            <QuickAction icon={Boxes} label="Bulk sell" onClick={() => navigate("/bulk")} />
            <QuickAction icon={ShoppingBag} label="Orders" badge={stats.toHandle} onClick={() => navigate("/orders")} />
            <QuickAction icon={CowSilhouetteIcon} iconClassName="h-8 w-8" label="My animals" onClick={() => navigate("/livestock")} />
          </div>
        </div>
      </div>

      {loadError && <p role="status" className="mt-4 rounded-2xl bg-amber-100/80 px-4 py-3 text-sm font-medium text-amber-900">{loadError}</p>}

      {!loading && (ordersToHandle.length > 0 || expiredCount > 0) && (
        <section className="mt-6" aria-labelledby="todo-heading">
          <SectionHeader title={<span id="todo-heading">To do</span>} />
          <div className="mt-3 space-y-2.5">
            {ordersToHandle.slice(0, 3).map((order) => {
              const meta = orderStatusMeta(order.status);
              const { title } = orderItemTitle(order.items?.[0]);
              return (
                <button key={order.id} type="button" onClick={() => navigate(`/orders/${order.id}`)} className="flex min-h-[72px] w-full items-center gap-3 rounded-[1.25rem] border border-amber-300/70 bg-amber-50 p-3.5 text-left transition-colors hover:bg-amber-100/70">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800"><Camera className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-foreground">{title}</span>
                    <span className="mt-0.5 block text-sm leading-snug text-amber-900">{meta.next}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-amber-800" />
                </button>
              );
            })}
            {expiredCount > 0 && (
              <button type="button" onClick={() => navigate("/livestock?filter=Expired")} className="flex min-h-[72px] w-full items-center gap-3 rounded-[1.25rem] border border-destructive/25 bg-destructive/5 p-3.5 text-left transition-colors hover:bg-destructive/10">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><AlertTriangle className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-foreground">{expiredCount} listing{expiredCount === 1 ? "" : "s"} expired</span>
                  <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">Buyers can&apos;t see {expiredCount === 1 ? "it" : "them"}. Check the details and renew for 14 days.</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-destructive" />
              </button>
            )}
          </div>
        </section>
      )}

      <SectionHeader title="Farm overview" className="mt-6" />
      <div className="soft-card mt-3 grid grid-cols-3 divide-x divide-border/70 overflow-hidden p-1">
        <OverviewMetric icon={PackageCheck} label="For sale" value={loading ? "—" : stats.active} tone="primary" onClick={() => navigate("/livestock?filter=Available")} />
        <OverviewMetric icon={Clock} label="Orders to handle" value={loading ? "—" : stats.toHandle} tone="warning" onClick={() => navigate("/orders?filter=action")} />
        <OverviewMetric icon={TrendingUp} label="Sold" value={loading ? "—" : stats.sold} tone="success" onClick={() => navigate("/orders?filter=done")} />
      </div>
      {!loading && stats.awaitingPayment > 0 && (
        <p className="mt-2 px-1 text-sm text-muted-foreground">{stats.awaitingPayment} more order{stats.awaitingPayment === 1 ? " is" : "s are"} waiting for the buyer to pay.</p>
      )}

      <div className="mt-7">
        <SectionHeader title="Your animals for sale" action={<button type="button" onClick={() => navigate("/livestock")} className="min-h-11 rounded-full px-3 text-sm font-bold text-primary hover:bg-secondary/60">See all</button>} />
        {loading ? (
          <div className="mt-3 aspect-[16/11] animate-pulse rounded-[1.25rem] bg-muted sm:aspect-[16/7]" />
        ) : forSale.length ? (
          <div className="mt-3"><FeaturedListingsCarousel items={forSale} onView={(item) => navigate(`/livestock/${item.id}`)} /></div>
        ) : (
          <EmptyState className="mt-3" icon={CowSilhouetteIcon} title="Nothing for sale right now" description="Add an animal so buyers can find it on QURBI." action={<button type="button" onClick={() => navigate("/livestock/add")} className="brand-gradient min-h-11 rounded-2xl px-5 text-sm font-bold text-white">Add animal</button>} />
        )}
      </div>

      {recentOrders.length > 0 && (
        <div className="mt-7">
          <SectionHeader title="Recent orders" action={<button type="button" onClick={() => navigate("/orders")} className="min-h-11 rounded-full px-3 text-sm font-bold text-primary hover:bg-secondary/60">See all</button>} />
          <div className="mt-3 space-y-2.5">
            {recentOrders.map((order) => {
              const { title } = orderItemTitle(order.items?.[0]);
              return (
                <button key={order.id} type="button" onClick={() => navigate(`/orders/${order.id}`)} className="soft-card flex min-h-[78px] w-full items-center gap-3 p-3.5 text-left transition-all hover:border-primary/20 hover:bg-card/80">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-base font-bold">{title}{order.items?.length > 1 ? ` +${order.items.length - 1}` : ""}</p>
                      <p className="shrink-0 text-base font-extrabold text-primary">{formatMYR(order.farmer_total)}</p>
                    </div>
                    <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2">
                      <span className="min-w-0 truncate whitespace-nowrap text-sm text-muted-foreground">#{order.order_number || order.id.slice(-6).toUpperCase()}</span>
                      <StatusBadge className="shrink-0" kind="order" status={order.status} dot />
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * @param {{ icon: React.ElementType, iconClassName?: string, label: React.ReactNode, onClick: () => void, primary?: boolean, badge?: number }} props
 */
function QuickAction({ icon: Icon, iconClassName = "h-5 w-5", label, onClick, primary, badge = 0 }) {
  return (
    <button type="button" onClick={onClick} className="group flex min-h-[88px] min-w-0 flex-col items-center gap-2 rounded-2xl px-1 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className={cn("relative flex h-14 w-14 items-center justify-center rounded-full transition-transform group-hover:-translate-y-0.5", primary ? "brand-gradient text-primary-foreground shadow-[0_5px_14px_rgba(65,54,45,0.2)]" : "bg-secondary/65 text-primary")}>
        <Icon className={iconClassName} />
        {badge > 0 && <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-card bg-amber-500 px-1 text-[11px] font-extrabold text-white" aria-label={`${badge} to handle`}>{badge}</span>}
      </span>
      <span className="text-center text-xs font-bold leading-tight text-foreground sm:text-sm">{label}</span>
    </button>
  );
}

function OverviewMetric({ icon: Icon, label, value, tone, onClick }) {
  const tones = {
    primary: "bg-secondary text-primary",
    warning: "bg-amber-100 text-amber-800",
    success: "bg-emerald-100 text-emerald-800",
  };

  return (
    <button type="button" onClick={onClick} className="flex min-h-[112px] min-w-0 flex-col items-center px-2 py-3 text-center transition-colors hover:bg-muted/35 sm:px-4">
      <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
      <span className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">{value}</span>
      <span className="mt-0.5 text-xs font-semibold leading-tight text-muted-foreground sm:text-sm">{label}</span>
    </button>
  );
}
