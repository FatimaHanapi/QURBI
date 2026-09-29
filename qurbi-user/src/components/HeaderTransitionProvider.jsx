import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";

const NORMAL_EXIT_MS = 340;
const ICON_EXIT_MS = 620;
const ENTER_MS = 540;
const FAILSAFE_MS = 1800;

const HeaderTransitionContext = createContext({
  phase: "idle",
  isContracting: false,
  isIconClosing: false,
  iconOrigin: null,
  transitionType: null,
  /** @type {(...args: any[]) => any} */
  beginIconTransition: () => {},
  /** @type {(...args: any[]) => any} */
  navigateWithTransition: () => {},
  /** @type {(...args: any[]) => any} */
  navigateFromIconPage: () => {},
});

export function useHeaderTransition() {
  return useContext(HeaderTransitionContext);
}

const iconTypeForPath = (pathname) =>
  pathname === "/notifications"
    ? "notification"
    : pathname === "/profile"
      ? "profile"
      : null;

export default function HeaderTransitionProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [phase, setPhase] = useState("idle");
  const [iconOrigin, setIconOrigin] = useState(null);
  const [transitionType, setTransitionType] = useState(null);
  const lockedRef = useRef(false);
  const iconOriginRef = useRef(null);
  const timersRef = useRef(new Set());
  const locationKeyRef = useRef(location.key);

  const schedule = useCallback((callback, delay) => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
    return timer;
  }, []);

  const unlock = useCallback(() => {
    lockedRef.current = false;
    setPhase("idle");
    setTransitionType(null);
  }, []);

  const beginIconTransition = useCallback((type, element) => {
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const origin = {
      type,
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    };
    iconOriginRef.current = origin;
    setIconOrigin(origin);
  }, []);

  const navigateWithTransition = useCallback(
    (destination, options = {}) => {
      if (lockedRef.current) return false;

      const currentType = iconTypeForPath(location.pathname);
      const destinationPath =
        typeof destination === "string"
          ? new URL(destination, window.location.href).pathname
          : "";
      const destinationType = iconTypeForPath(destinationPath);
      const requestedType =
        options.transitionType || currentType || destinationType || null;
      const closingFromIcon = Boolean(
        currentType && iconOriginRef.current?.type === currentType,
      );

      lockedRef.current = true;
      setTransitionType(requestedType);
      setPhase("exiting");

      const delay = closingFromIcon ? ICON_EXIT_MS : NORMAL_EXIT_MS;
      schedule(() => {
        if (typeof destination === "number") {
          navigate(destination);
          return;
        }
        flushSync(() => {
          navigate(destination, options.navigateOptions);
        });
      }, delay);
      schedule(unlock, FAILSAFE_MS);
      return true;
    },
    [location.pathname, navigate, schedule, unlock],
  );

  const navigateFromIconPage = useCallback(
    (destination, navigateOptions) =>
      navigateWithTransition(destination, { navigateOptions }),
    [navigateWithTransition],
  );

  useLayoutEffect(() => {
    if (locationKeyRef.current === location.key) return;
    locationKeyRef.current = location.key;
    // A route must never inherit the previous screen's scroll offset. Doing
    // this in layout effect keeps the destination header in place before its
    // first painted frame, including navigation from a collapsed header.
    window.scrollTo(0, 0);
    setPhase("entering");
    schedule(unlock, ENTER_MS);
  }, [location.key, schedule, unlock]);

  // Links cover BottomNav, cards and normal header actions. Programmatic
  // navigation uses navigateWithTransition explicitly on the affected pages.
  useEffect(() => {
    const handleLinkClick = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return;

      const link = event.target.closest("a[href]");
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const destination = `${url.pathname}${url.search}${url.hash}`;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (destination === current) return;

      event.preventDefault();
      if (lockedRef.current) return;
      const destinationType = iconTypeForPath(url.pathname);
      if (destinationType) beginIconTransition(destinationType, link);
      navigateWithTransition(destination, {
        transitionType: destinationType || iconOriginRef.current?.type,
      });
    };

    document.addEventListener("click", handleLinkClick, true);
    return () => document.removeEventListener("click", handleLinkClick, true);
  }, [beginIconTransition, navigateWithTransition]);

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current) window.clearTimeout(timer);
      timersRef.current.clear();
    };
  }, []);

  const currentIconType = iconTypeForPath(location.pathname);
  const isIconClosing =
    phase === "exiting" &&
    Boolean(currentIconType && iconOrigin?.type === currentIconType);

  return (
    <HeaderTransitionContext.Provider
      value={{
        phase,
        isContracting: phase === "exiting" && !isIconClosing,
        isIconClosing,
        iconOrigin,
        transitionType,
        beginIconTransition,
        navigateWithTransition,
        navigateFromIconPage,
      }}
    >
      {children}
    </HeaderTransitionContext.Provider>
  );
}
