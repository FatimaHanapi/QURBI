import React, { useEffect, useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { qurbi } from "@/api/qurbiClient";
import { useAuth } from "@/lib/AuthContext";
import BrandLogo from "@/components/agri/BrandLogo";
import AdminBottomNav from "@/components/agri/AdminBottomNav";
import { LogOut, LayoutDashboard, UserCheck, Users, ShoppingBag, Tags } from "lucide-react";
import { cn } from "@/lib/utils";
import { isPendingRefund } from "@/components/admin/adminFormat";
import CowSilhouetteIcon from "@/components/agri/CowSilhouetteIcon";

const TABS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/farmers", label: "Farmers", icon: UserCheck },
  { to: "/admin/users", label: "Buyers", icon: Users },
  { to: "/admin/livestock", label: "Livestock", icon: CowSilhouetteIcon },
  { to: "/admin/breeds", label: "Breeds", icon: Tags },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [pendingRefunds, setPendingRefunds] = useState(0);

  useEffect(() => {
    let active = true;
    const loadPendingRefunds = () => qurbi.functions.invoke("fetchAdminBuyerOrders")
      .then((response) => {
        if (!active) return;
        const orders = response.data?.orders || [];
        setPendingRefunds(orders.filter(isPendingRefund).length);
      })
      .catch(() => { if (active) setPendingRefunds(0); });
    loadPendingRefunds();
    const interval = window.setInterval(loadPendingRefunds, 60000);
    window.addEventListener("focus", loadPendingRefunds);
    window.addEventListener("admin-refunds-changed", loadPendingRefunds);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", loadPendingRefunds);
      window.removeEventListener("admin-refunds-changed", loadPendingRefunds);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[260px] z-30 flex-col border-r border-border bg-card">
        <div className="px-6 py-5 border-b border-border">
          <BrandLogo compact />
        </div>
        <div className="px-6 py-3">
          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">Super Admin</span>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <Icon className="w-5 h-5" /> <span className="flex-1">{label}</span>
              {to === "/admin/orders" && pendingRefunds > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-extrabold text-destructive-foreground">{pendingRefunds > 99 ? "99+" : pendingRefunds}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-border space-y-2">
          <div className="px-3">
            <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" /> Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-[260px]">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandLogo compact />
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">Super Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => logout()} aria-label="Log out" title="Log out" className="w-11 h-11 rounded-full bg-destructive/10 text-destructive flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="px-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))] pt-4 lg:px-10 lg:pb-12 lg:pt-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <AdminBottomNav pendingRefunds={pendingRefunds} />
    </div>
  );
}
