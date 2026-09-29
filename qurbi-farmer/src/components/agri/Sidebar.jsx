import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import BrandLogo from "@/components/agri/BrandLogo";
import { Bell, Boxes, Home, ShoppingBag, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import CowSilhouetteIcon from "@/components/agri/CowSilhouetteIcon";

const ITEMS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/livestock", label: "My Livestock", icon: CowSilhouetteIcon },
  { to: "/bulk", label: "Bulk Sell", icon: Boxes },
  { to: "/orders", label: "Orders", icon: ShoppingBag },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const name = user?.data?.name || user?.full_name || user?.email?.split("@")[0] || "Farmer";

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-border/70 bg-card/95 shadow-[4px_0_24px_rgba(65,54,45,0.04)] lg:flex">
      <div className="px-6 py-5 border-b border-border">
        <BrandLogo />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all",
                isActive
                  ? "brand-gradient text-primary-foreground shadow-[0_4px_12px_rgba(65,54,45,0.15)]"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-border space-y-2">
        <div className="px-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5" /> Log out
        </button>
      </div>
    </aside>
  );
}
