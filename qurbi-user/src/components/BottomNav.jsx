import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Boxes, Home, Leaf, ShoppingCart, Package } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { CART_ARRIVAL_EVENT } from "@/lib/cart-animation";

const TABS = [
  { path: "/browse", icon: Leaf, label: "Browse" },
  { path: "/bulk-buy", icon: Boxes, label: "Bulk Buy" },
  { path: "/", icon: Home, label: "Home", center: true },
  { path: "/cart", icon: ShoppingCart, label: "Cart", badge: true },
  { path: "/orders", icon: Package, label: "Orders" },
];

export default function BottomNav() {
  const location = useLocation();
  const { totalItems = 0 } = useCart() || {};
  const [cartBouncing, setCartBouncing] = useState(false);
  const bounceTimer = useRef(null);

  useEffect(() => {
    const onArrival = () => {
      setCartBouncing(false);
      requestAnimationFrame(() => setCartBouncing(true));
      window.clearTimeout(bounceTimer.current);
      bounceTimer.current = window.setTimeout(
        () => setCartBouncing(false),
        520,
      );
    };
    document.addEventListener(CART_ARRIVAL_EVENT, onArrival);
    return () => {
      document.removeEventListener(CART_ARRIVAL_EVENT, onArrival);
      window.clearTimeout(bounceTimer.current);
    };
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="pointer-events-auto relative mx-auto w-full">
        {/* Navbar */}
        <nav className="qurbi-nav-background relative flex min-h-[76px] items-end justify-around bg-gradient-to-br from-[#41362D] to-[#6B594A] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl shadow-[0_-8px_30px_rgba(65,54,45,0.25)]">
          {TABS.map(({ path, icon: Icon, label, badge, center }) => {
            const isActive =
              path === "/bulk-buy"
                ? location.pathname.startsWith(path)
                : location.pathname === path;

            /* Center floating button */
            if (center) {
              return (
                <Link
                  key={path}
                  to={path}
                  className="relative -mt-10 flex flex-1 flex-col items-center"
                >
                  <div
                    className={`
                      relative flex h-16 w-16 items-center justify-center
                      rounded-full
                      border-4 border-[#F7EDE2]
                      bg-gradient-to-br from-[#41362D] to-[#6B594A]
                      shadow-[0_4px_20px_rgba(65,54,45,0.5)]
                      transition-all duration-300
                      ${isActive ? "scale-105" : ""}
                    `}
                  >
                    <Icon className="h-6 w-6 text-white" />

                    {/* Small glow */}
                    <span className="absolute inset-0 rounded-full ring-1 ring-white/30" />
                  </div>

                  <span className="mt-1 text-[9px] font-semibold text-white">
                    {label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={path}
                to={path}
                className="relative flex flex-1 flex-col items-center justify-end gap-1 py-1 active:scale-90 transition-transform"
              >
                <div
                  data-cart-nav-icon={path === "/cart" ? "true" : undefined}
                  className={`
                    flex h-8 w-8 items-center justify-center rounded-xl
                    transition-all duration-300
                    ${isActive ? "bg-[#E3C19F]" : ""}
                    ${path === "/cart" && cartBouncing ? "animate-cart-arrival" : ""}
                  `}
                >
                  <Icon
                    className={`h-5 w-5 ${isActive ? "text-black" : "text-white"}`}
                  />
                </div>

                <span className="text-[9px] font-semibold text-white">
                  {label}
                </span>

                {badge && totalItems > 0 && (
                  <span className="absolute right-4 top-0 flex h-4 min-w-4 items-center justify-center rounded-full border border-white/70 bg-[#F7EDE2]0 px-1 text-[9px] font-bold text-white shadow-sm"> 
                    {totalItems}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
