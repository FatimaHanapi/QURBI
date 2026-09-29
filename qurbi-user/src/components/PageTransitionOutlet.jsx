import React from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { useHeaderTransition } from "@/components/HeaderTransitionProvider";

export default function PageTransitionOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const { phase, isIconClosing, iconOrigin, transitionType } =
    useHeaderTransition();
  const pageType =
    location.pathname === "/notifications"
      ? "notification"
      : location.pathname === "/profile"
        ? "profile"
        : null;
  const usesIconOrigin = Boolean(
    pageType && iconOrigin?.type === pageType && transitionType === pageType,
  );

  const animationClass = usesIconOrigin
    ? isIconClosing
      ? `animate-${pageType}-origin-exit`
      : `animate-${pageType}-origin-enter`
    : phase === "exiting"
      ? "animate-page-exit"
      : phase === "entering"
        ? "animate-page-enter"
        : "";

  return (
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
      {outlet}
    </div>
  );
}
