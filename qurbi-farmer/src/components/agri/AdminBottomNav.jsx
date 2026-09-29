import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, MoreHorizontal, ShoppingBag, Tags, UserCheck, Users } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import CowSilhouetteIcon from "@/components/agri/CowSilhouetteIcon";

const PRIMARY_ITEMS = [
  { to: "/admin/farmers", label: "Farmers", icon: UserCheck },
  { to: "/admin/users", label: "Buyers", icon: Users },
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true, featured: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
];

const MORE_ITEMS = [
  { to: "/admin/livestock", label: "Livestock", description: "Review all animal listings", icon: CowSilhouetteIcon },
  { to: "/admin/breeds", label: "Breeds", description: "Approve and manage breeds", icon: Tags },
];

export default function AdminBottomNav({ pendingRefunds = 0 }) {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_ITEMS.some((item) => location.pathname.startsWith(item.to));

  return (
    <>
      <nav aria-label="Super Admin navigation" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background via-background/95 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4 lg:hidden">
        <div className="pointer-events-auto mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[2rem] border border-border/70 bg-card/95 p-2 shadow-[0_14px_38px_rgba(65,54,45,0.18)] backdrop-blur-xl">
          {PRIMARY_ITEMS.map(({ to, label, icon: Icon, end, featured }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn(
                "relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                featured && "-mt-5",
                isActive ? "text-primary" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              {({ isActive }) => (
                <>
                  <span className={cn(
                    "relative flex h-8 w-8 items-center justify-center rounded-full transition-all",
                    featured && "h-12 w-12 shadow-[0_7px_18px_rgba(65,54,45,0.24)]",
                    isActive && !featured && "bg-secondary",
                    featured && (isActive ? "brand-gradient text-white" : "bg-secondary text-primary"),
                  )}>
                    <Icon className={cn("h-5 w-5", featured && "h-6 w-6")} strokeWidth={isActive ? 2.6 : 2} />
                    {to === "/admin/orders" && pendingRefunds > 0 && (
                      <span className="absolute -right-2 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-extrabold leading-none text-destructive-foreground">
                        {pendingRefunds > 99 ? "99+" : pendingRefunds}
                      </span>
                    )}
                  </span>
                  <span className="max-w-full truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="More admin pages"
            className={cn(
              "flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              moreActive ? "text-primary" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-full transition-all", moreActive && "bg-secondary")}>
              <MoreHorizontal className="h-5 w-5" strokeWidth={moreActive ? 2.6 : 2} />
            </span>
            <span>More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 lg:hidden">
          <SheetHeader className="pr-8 text-left">
            <SheetTitle>More management</SheetTitle>
            <SheetDescription>Manage marketplace records and approval lists.</SheetDescription>
          </SheetHeader>
          <div className="mt-5 grid gap-2">
            {MORE_ITEMS.map(({ to, label, description, icon: Icon }) => (
              <SheetClose asChild key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                    isActive ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted/60",
                  )}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold">{label}</span>
                    <span className="block text-xs text-muted-foreground">{description}</span>
                  </span>
                </NavLink>
              </SheetClose>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
