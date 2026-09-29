import React from "react";
import { NavLink } from "react-router-dom";
import { Bell, Home, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import CowSilhouetteIcon from "@/components/agri/CowSilhouetteIcon";

const ITEMS = [
  { to: "/livestock", label: "Livestock", icon: CowSilhouetteIcon, end: true },
  { to: "/orders", label: "Orders", icon: ShoppingBag },
  { to: "/", label: "Home", icon: Home, end: true, featured: true },
  { to: "/notifications", label: "Alerts", ariaLabel: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  return (
    <nav aria-label="Farmer navigation" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background via-background/95 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4 lg:hidden">
      <div className="pointer-events-auto mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[2rem] border border-border/70 bg-card/95 p-2 shadow-[0_14px_38px_rgba(65,54,45,0.18)] backdrop-blur-xl">
        {ITEMS.map(({ to, label, ariaLabel, icon: Icon, end, featured }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={ariaLabel || label}
            className={({ isActive }) =>
              cn(
                "min-h-[58px] rounded-2xl flex flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                featured && "-mt-5",
                isActive ? "text-primary" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                  featured && "h-12 w-12 shadow-[0_7px_18px_rgba(65,54,45,0.24)]",
                  isActive && !featured && "bg-secondary",
                  featured && (isActive ? "brand-gradient text-white" : "bg-secondary text-primary")
                )}>
                  <Icon className={cn("h-5 w-5", featured && "h-6 w-6")} strokeWidth={isActive ? 2.6 : 2} />
                </span>
                <span className="truncate max-w-full">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
