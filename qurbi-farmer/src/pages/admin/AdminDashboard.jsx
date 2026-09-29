import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, CheckCircle2, ChevronRight, RotateCcw, ShoppingBag, Tags, UserCheck, Users } from "lucide-react";
import { farmVerificationApi, farmerProfileApi, livestockApi, orderApi, userApi } from "@/api/apiClient";
import { qurbi } from "@/api/qurbiClient";
import { useAuth } from "@/lib/AuthContext";
import CowSilhouetteIcon from "@/components/agri/CowSilhouetteIcon";
import EmptyState from "@/components/agri/EmptyState";
import SectionHeader from "@/components/agri/SectionHeader";
import { cn } from "@/lib/utils";
import { formatDate, initials } from "@/components/admin/adminFormat";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [farmers, setFarmers] = useState([]);
  const [livestockCount, setLivestockCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [refundCount, setRefundCount] = useState(0);
  const [breedRequestCount, setBreedRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      userApi.list({ role: "farmer", page: 1, limit: 100 }),
      farmerProfileApi.list(),
      farmVerificationApi.list({ status: "pending", page: 1, limit: 100 }),
      livestockApi.list({ page: 1, limit: 1 }),
      orderApi.adminList({ page: 1, limit: 100 }),
      qurbi.entities.BreedRequest.filter({ status: "Pending" }).catch(() => []),
    ])
      .then(([userPage, profileRows, verificationPage, livestockPage, orderPage, breedRequests]) => {
        const usersById = new Map((userPage.data || []).map((item) => [item.id, item]));
        const profilesById = new Map((profileRows || []).map((item) => [item.id, item]));
        const pending = (verificationPage.data || []).map((verification) => {
          const profile = profilesById.get(verification.farmerProfileId);
          const farmer = profile ? usersById.get(profile.userId) : null;
          return farmer ? { ...farmer, _profile: profile, _verification: verification } : null;
        }).filter(Boolean);
        setFarmers(pending);
        setLivestockCount(livestockPage.total || 0);
        setOrderCount(orderPage.total || 0);
        setRefundCount((orderPage.data || []).filter((order) => order.refundStatus === "requested").length);
        setBreedRequestCount((breedRequests || []).filter((request) => request.status === "Pending").length);
      })
      .finally(() => setLoading(false));
  }, []);

  const adminName = user?.fullName || user?.data?.name || user?.full_name || user?.email?.split("@")[0] || "Admin";
  const attentionTotal = farmers.length + refundCount + breedRequestCount;

  return (
    <div className="animate-fade-in">
      <section className="home-brand-hero -mx-4 -mt-4 px-5 pb-12 pt-6 text-white lg:mx-0 lg:mt-0 lg:rounded-[1.75rem] lg:px-8 lg:pb-10">
        <div className="relative z-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">QURBI administration</p>
          <h1 className="mt-2 break-words text-2xl font-extrabold tracking-tight lg:text-3xl">Welcome back, {adminName}</h1>
          <p className="mt-1 max-w-lg text-sm text-white/80">
            {loading ? "Checking what needs your attention…" : attentionTotal ? `${attentionTotal} item${attentionTotal === 1 ? "" : "s"} need${attentionTotal === 1 ? "s" : ""} your review.` : "You're all caught up. Nothing is waiting for review."}
          </p>
          <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-secondary ring-1 ring-white/15 backdrop-blur"><BadgeCheck className="h-4 w-4" /> Super Admin</span>
            <span className="min-w-0 max-w-full truncate rounded-full bg-black/10 px-3 py-1.5 text-xs font-medium text-white/85 ring-1 ring-white/10">{user?.email}</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="attention-heading" className="relative z-20 -mx-4 -mt-6 rounded-t-[2rem] bg-background px-4 pt-5 lg:mx-0 lg:mt-6 lg:rounded-none lg:bg-transparent lg:px-0 lg:pt-0">
        <SectionHeader title={<span id="attention-heading">Needs your attention</span>} />
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          <AttentionTile icon={UserCheck} label="Farmer verifications" hint="Approve or reject new farmers" count={farmers.length} loading={loading} onClick={() => navigate("/admin/farmers?status=pending")} />
          <AttentionTile icon={RotateCcw} label="Refund requests" hint="Buyer refunds to review" count={refundCount} loading={loading} tone="danger" onClick={() => navigate("/admin/orders?filter=refunds")} />
          <AttentionTile icon={Tags} label="Breed requests" hint="New breeds proposed by farmers" count={breedRequestCount} loading={loading} onClick={() => navigate("/admin/breeds")} />
        </div>
      </section>

      <div className="mt-7 grid items-start gap-7 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        <section aria-labelledby="pending-heading" className="min-w-0">
          <SectionHeader
            title={<span id="pending-heading">Pending verifications</span>}
            action={farmers.length > 0 ? <button type="button" onClick={() => navigate("/admin/farmers?status=pending")} className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-bold text-primary hover:bg-secondary/60">See all<ChevronRight className="h-4 w-4" /></button> : null}
          />
          {loading ? (
            <div className="mt-3 space-y-2.5" aria-busy="true">{[0, 1].map((index) => <div key={index} className="h-[76px] animate-pulse rounded-[1.25rem] bg-muted" />)}</div>
          ) : farmers.length ? (
            <div className="mt-3 grid gap-2.5">
              {farmers.slice(0, 6).map((farmer) => {
                const profile = farmer._profile;
                const name = farmer.fullName || farmer.email?.split("@")[0] || "Unnamed farmer";
                const submitted = farmer._verification?.createdAt;
                return (
                  <button
                    key={farmer.id}
                    type="button"
                    onClick={() => navigate(`/admin/farmers/${farmer.id}`)}
                    className="soft-card flex min-h-[76px] min-w-0 items-center gap-3 p-3.5 text-left transition-all hover:border-primary/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-sm font-extrabold text-amber-800" aria-hidden="true">{initials(name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-extrabold">{name}</span>
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground">{profile?.farmName || "Farm profile"}{profile?.farmState ? ` · ${profile.farmState}` : ""}</span>
                      {submitted && <span className="mt-0.5 block text-xs text-muted-foreground">Submitted {formatDate(submitted)}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-primary">Review<ChevronRight className="h-4 w-4" /></span>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState className="mt-3 py-9" icon={CheckCircle2} title="No pending farmers" description="All caught up. New verification requests will appear here." action={<button type="button" onClick={() => navigate("/admin/farmers")} className="min-h-11 rounded-full bg-secondary/70 px-5 text-sm font-bold text-primary hover:bg-secondary">View all farmers</button>} />
          )}
        </section>

        <div className="min-w-0 space-y-7">
          <section aria-labelledby="overview-heading">
            <SectionHeader title={<span id="overview-heading">Marketplace overview</span>} />
            <div className="soft-card mt-3 grid grid-cols-3 divide-x divide-border/70 overflow-hidden">
              <OverviewMetric icon={UserCheck} label="Pending farmers" value={loading ? "—" : farmers.length} tone="warning" onClick={() => navigate("/admin/farmers?status=pending")} />
              <OverviewMetric icon={CowSilhouetteIcon} label="Livestock" value={loading ? "—" : livestockCount} tone="primary" onClick={() => navigate("/admin/livestock")} />
              <OverviewMetric icon={ShoppingBag} label="Orders" value={loading ? "—" : orderCount} tone="success" onClick={() => navigate("/admin/orders?filter=all")} />
            </div>
          </section>

          <section aria-labelledby="shortcuts-heading">
            <SectionHeader title={<span id="shortcuts-heading">Shortcuts</span>} />
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <QuickAction icon={Tags} label="Add breed" onClick={() => navigate("/admin/breeds?action=add")} primary />
              <QuickAction icon={CowSilhouetteIcon} label="All livestock" onClick={() => navigate("/admin/livestock")} />
              <QuickAction icon={Users} label="Buyers" onClick={() => navigate("/admin/users")} />
              <QuickAction icon={ShoppingBag} label="All orders" onClick={() => navigate("/admin/orders?filter=all")} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * @param {{ icon: React.ElementType, label: string, hint: string, count: number, loading: boolean, tone?: string, onClick: () => void }} props
 */
function AttentionTile({ icon: Icon, label, hint, count, loading, tone = "warning", onClick }) {
  const active = !loading && count > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "soft-card flex min-h-[72px] min-w-0 items-center gap-3 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && (tone === "danger" ? "border-destructive/35 bg-red-50/70" : "border-amber-300/80 bg-amber-50/70"),
      )}
    >
      <span className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
        active ? (tone === "danger" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800") : "bg-secondary/60 text-primary",
      )}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-extrabold text-foreground">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{loading ? "Loading…" : active ? hint : "All clear"}</span>
      </span>
      <span className={cn("shrink-0 text-2xl font-extrabold tabular-nums", active ? (tone === "danger" ? "text-red-700" : "text-amber-800") : "text-muted-foreground/70")}>{loading ? "—" : count}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

/**
 * @param {{ icon: React.ElementType, label: React.ReactNode, onClick: () => void, primary?: boolean }} props
 */
function QuickAction({ icon: Icon, label, onClick, primary }) {
  return (
    <button type="button" onClick={onClick} className="soft-card group flex min-h-[56px] min-w-0 items-center gap-2.5 p-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", primary ? "brand-gradient text-primary-foreground shadow-[0_5px_14px_rgba(65,54,45,0.2)]" : "bg-secondary/65 text-primary")}><Icon className="h-5 w-5" /></span>
      <span className="min-w-0 truncate text-sm font-bold text-foreground">{label}</span>
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
    <button type="button" onClick={onClick} className="flex min-h-[104px] min-w-0 flex-col items-center justify-center px-2 py-3 text-center transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
      <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
      <span className="mt-1.5 text-xl font-extrabold tracking-tight text-foreground">{value}</span>
      <span className="mt-0.5 text-xs font-semibold leading-tight text-muted-foreground">{label}</span>
    </button>
  );
}

