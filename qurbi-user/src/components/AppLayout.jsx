import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useHeaderTransition } from "@/components/HeaderTransitionProvider";

export default function AppLayout() {
  const location = useLocation();
  const { phase, isIconClosing, iconOrigin, transitionType } = useHeaderTransition();
  const specialType =
    location.pathname === "/notifications"
      ? "notification"
      : location.pathname === "/profile"
        ? "profile"
        : null;
  const usesIconOrigin = Boolean(
    specialType && iconOrigin?.type === specialType && transitionType === specialType,
  );
  const animationClass = usesIconOrigin
    ? isIconClosing
      ? `animate-${specialType}-origin-exit`
      : `animate-${specialType}-origin-enter`
    : phase === "exiting"
      ? "animate-page-exit"
      : phase === "entering"
        ? "animate-page-enter"
        : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2]">
      <div
        className={animationClass}
        style={
          usesIconOrigin
            ? {
                "--icon-origin-x": `${iconOrigin.x}px`,
                "--icon-origin-y": `${iconOrigin.y}px`,
              }
            : undefined
        }
      >
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
