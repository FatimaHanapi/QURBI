import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Bell, Leaf, User } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useHeaderTransition } from "@/components/HeaderTransitionProvider";
import { useNotifications } from "@/lib/notification-context";

const HEADER_SHRINK_SCROLL_Y = 12;
const HEADER_EXPAND_SCROLL_Y = 4;

/** Shared QURBI page header for normal in-app screens. */
export default function AppHeader({
  title,
  eyebrow = "QURBI",
  subtitle = "",
  backTo = "",
  search = null,
  children = null,
  sticky = false,
  guestActionsOnLeft = false,
  progressiveShrink = false,
  thresholdShrink = false,
  titleClassName = "",
  subtitleClassName = "",
}) {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { unreadCount } = useNotifications();
  const { isContracting, beginIconTransition, navigateWithTransition } = useHeaderTransition();
  const hasExpandableContent = Boolean(search || children);
  const [extraVisible, setExtraVisible] = useState(false);
  const [headerEntered, setHeaderEntered] = useState(false);
  const [isScrollShrunk, setIsScrollShrunk] = useState(false);
  const [expandedHeight, setExpandedHeight] = useState(0);
  const headerRef = useRef(null);
  const shrinkEnabled = progressiveShrink || thresholdShrink;
  const headerExpanded = headerEntered && !isContracting;
  const headerCopyAnimation = isContracting
    ? "animate-header-copy-exit"
    : headerEntered
      ? "animate-header-copy-enter"
      : "header-copy-pending";

  useEffect(() => {
    const frame = requestAnimationFrame(() => setHeaderEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hasExpandableContent) {
      setExtraVisible(false);
      return undefined;
    }
    const frame = requestAnimationFrame(() => setExtraVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [hasExpandableContent]);

  useEffect(() => {
    if (!shrinkEnabled) return undefined;
    let frame = 0;
    let shrunk = false;

    // A newly mounted page always starts with its header expanded, even if the
    // browser has not restored/reset the previous route's scroll position yet.
    setIsScrollShrunk(false);

    const updateShrinkState = () => {
      frame = 0;
      const shouldShrink = shrunk
        ? window.scrollY > HEADER_EXPAND_SCROLL_Y
        : window.scrollY >= HEADER_SHRINK_SCROLL_Y;
      if (shouldShrink === shrunk) return;
      shrunk = shouldShrink;
      setIsScrollShrunk(shouldShrink);
    };
    const handleScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateShrinkState);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [shrinkEnabled, location.pathname]);

  useEffect(() => {
    if (!shrinkEnabled || !headerEntered || !extraVisible) return undefined;
    const timer = window.setTimeout(() => {
      if (headerRef.current) setExpandedHeight(headerRef.current.scrollHeight);
    }, 850);
    return () => window.clearTimeout(timer);
  }, [shrinkEnabled, headerEntered, extraVisible, title, subtitle]);

  useLayoutEffect(() => {
    if (!shrinkEnabled || !expandedHeight || !headerRef.current) return undefined;
    const page = headerRef.current.closest(".aisyah-page");
    if (!page) return undefined;

    page.style.setProperty(
      "--qurbi-header-collapse-offset",
      `${Math.max(0, expandedHeight - 108 - HEADER_SHRINK_SCROLL_Y)}px`,
    );
    page.classList.toggle("qurbi-header-is-shrunk", isScrollShrunk);

    return () => {
      page.classList.remove("qurbi-header-is-shrunk");
      page.style.removeProperty("--qurbi-header-collapse-offset");
    };
  }, [expandedHeight, isScrollShrunk, shrinkEnabled]);

  const shrinkStyle = shrinkEnabled
    ? expandedHeight
      ? {
          height: isScrollShrunk || isContracting ? "108px" : `${expandedHeight}px`,
          paddingTop: isScrollShrunk || isContracting ? "12px" : "28px",
          paddingBottom: isScrollShrunk || isContracting ? "8px" : "16px",
          transition:
            "height 440ms cubic-bezier(0.22, 1, 0.36, 1), padding 440ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "height, padding",
        }
      : isScrollShrunk || isContracting
        ? {
            height: "108px",
            paddingTop: "12px",
            paddingBottom: "8px",
          }
        : undefined
    : undefined;
  /** @type {React.CSSProperties | undefined} */
  const shrinkingContentStyle = shrinkEnabled
    ? {
        opacity: isScrollShrunk || isContracting ? 0 : 1,
        pointerEvents: isScrollShrunk || isContracting ? "none" : "auto",
        transition: "opacity 320ms ease-out",
        willChange: "opacity",
      }
    : undefined;

  const headerMarkup = (
    <header
      ref={headerRef}
      className={`${shrinkEnabled ? (expandedHeight ? "absolute inset-x-0 top-0" : "relative") : sticky ? "sticky top-0 z-30" : "relative"} qurbi-header-background overflow-hidden rounded-b-[28px] bg-gradient-to-br from-[#41362D] to-[#6B594A] px-4 shadow-lg transition-[padding,border-radius,box-shadow] duration-500 ease-in-out sm:px-5 ${headerExpanded ? "pb-4 pt-7 sm:pt-8" : "pb-2 pt-3 sm:pt-4"}`}
      style={{ viewTransitionName: "qurbi-header", ...shrinkStyle }}
    >
      <div
        className={`relative z-10 flex origin-top flex-col items-center text-center transition-transform duration-500 ease-in-out ${headerExpanded ? "scale-100" : "scale-[0.96]"}`}
      >
        <div className="absolute left-0 top-0 z-20 flex flex-row items-center gap-1.5">
          {isAuthenticated && (
            <Link
              to="/notifications"
              onClick={(event) =>
                beginIconTransition("notification", event.currentTarget)
              }
              aria-label={
                unreadCount
                  ? `Open notifications, ${unreadCount} unread`
                  : "Open notifications"
              }
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-transform active:scale-90"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          )}
          {!isAuthenticated && guestActionsOnLeft && (
            <>
              <Link
                to="/auth?mode=login"
                className="rounded-lg px-1.5 py-2 text-[10px] font-bold text-white/90"
              >
                Login
              </Link>
              <Link
                to="/auth?mode=register"
                className="rounded-lg bg-white/15 px-1.5 py-2 text-[10px] font-bold text-white"
              >
                Sign Up
              </Link>
            </>
          )}
          {backTo && (
            <button
              type="button"
              onClick={() => navigateWithTransition(backTo)}
              aria-label="Go back"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F7EDE2]/60 bg-white/10 text-white transition-transform active:scale-90"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="absolute right-0 top-0 z-20 flex flex-row items-center gap-1.5">
          {!isAuthenticated && !guestActionsOnLeft && (
            <>
              <Link
                to="/auth?mode=login"
                className="rounded-lg px-1.5 py-2 text-[10px] font-bold text-white/90"
              >
                Login
              </Link>
              <Link
                to="/auth?mode=register"
                className="rounded-lg bg-white/15 px-1.5 py-2 text-[10px] font-bold text-white"
              >
                Sign Up
              </Link>
            </>
          )}
          {isAuthenticated && (
            <Link
              to="/profile"
              onClick={(event) =>
                beginIconTransition("profile", event.currentTarget)
              }
              aria-label="Open profile"
              className="relative flex-none transition-transform active:scale-90"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/30 bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] shadow-lg">
                <User className="h-4.5 w-4.5 text-[#41362D]" />
              </div>
            </Link>
          )}
        </div>

        <div
          className={`pointer-events-none flex w-full flex-col items-center text-center ${headerCopyAnimation}`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          {eyebrow && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-white/70">
              {eyebrow}
            </p>
          )}
          <h1
            className={`mt-0.5 max-w-[65%] text-xl font-bold leading-tight tracking-tight text-white sm:max-w-none ${titleClassName}`}
          >
            {title}
          </h1>
        </div>
      </div>

      {subtitle && (
        <div
          className={`relative z-10 grid transition-[grid-template-rows] duration-500 ease-in-out ${headerEntered && !isContracting ? "grid-rows-[1fr] delay-0" : "grid-rows-[0fr]"}`}
        >
          <div
            className="min-h-0 overflow-hidden"
            style={shrinkingContentStyle}
          >
            <p
              className={`header-copy-description mx-auto mt-2.5 max-w-xl text-center text-sm leading-relaxed text-white/70 ${headerCopyAnimation} ${subtitleClassName}`}
            >
              {subtitle}
            </p>
          </div>
        </div>
      )}

      <div
        className={`relative z-10 grid ${shrinkEnabled ? "transition-[grid-template-rows]" : "transition-[grid-template-rows,opacity]"} duration-500 ease-in-out ${extraVisible && !isContracting ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
        aria-hidden={!hasExpandableContent}
      >
        <div
          className="min-h-0 overflow-hidden"
          style={shrinkingContentStyle}
        >
          <div
            className={`pt-2 text-center transition-all duration-500 ease-in-out ${extraVisible && !isContracting ? "translate-y-0" : "-translate-y-2"}`}
          >
            {search && <div className="mx-auto max-w-xl">{search}</div>}
            {children && <div className="mt-2">{children}</div>}
          </div>
        </div>
      </div>
    </header>
  );

  if (!shrinkEnabled) return headerMarkup;

  return (
    <div
      className={`qurbi-shrinkable-header-shell ${sticky ? "sticky top-0 z-30" : "relative"} w-full`}
      style={expandedHeight ? { height: `${expandedHeight}px` } : undefined}
    >
      {headerMarkup}
    </div>
  );
}
