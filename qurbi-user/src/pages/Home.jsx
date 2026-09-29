import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Boxes,
  Leaf,
  ShoppingCart,
  Package,
  User,
  ChevronRight,
  Search,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useReveal } from "@/hooks/useReveal";
import SplashScreen from "@/components/SplashScreen";
import { useAuth } from "@/lib/AuthContext";
import AppHeader from "@/components/AppHeader";
import ViewCartCard from "@/components/ViewCartCard";
import LivestockCard from "@/components/shop/LivestockCard";
import { loadLivestockWithFarmers } from "@/lib/farmerClient";
import { isProductExpired } from "@/lib/product-expiry";
import cowImage from "@/assets/home-categories/Lembu-white.png";
import goatImage from "@/assets/home-categories/Kambing-white.png";

// Shortcuts: each one carries a hint so it adds information the bottom nav
// does not (what is inside, how many), instead of repeating it.
const QUICK_ACTIONS = [
  { icon: Leaf, label: "browse", path: "/browse" },
  { icon: Boxes, label: "bulkBuy", path: "/bulk-buy" },
  { icon: ShoppingCart, label: "cart", path: "/cart" },
  { icon: Package, label: "orders", path: "/history" },
  { icon: User, label: "profile", path: "/profile" },
  { icon: MapPin, label: "addresses", path: "/address-book" },
];

const CHIP_TINTS = ["bg-gradient-to-br from-[#41362D] to-[#6B594A]"];
const HOME_SPECIES = ["Cow", "Goat"];
const HOME_SPECIES_IMAGES = { Cow: cowImage, Goat: goatImage };
const FEATURED_LIMIT = 6;
const HIGHLIGHTS = [
  {
    id: "findLivestock",
    path: "/browse",
    icon: Leaf,
    gradient: "from-[#41362D] to-[#6B594A]",
  },
  {
    id: "bulkBuy",
    path: "/bulk-buy",
    icon: Boxes,
    gradient: "from-[#6B594A] to-[#41362D]",
  },
  {
    id: "trackOrders",
    path: "/orders",
    icon: Package,
    gradient: "from-[#41362D] via-[#6B594A] to-[#4B3E34]",
  },
];
const BOOTSTRAP_FAILSAFE_MS = 6500;
const SPLASH_DURATION_MS = 3200;

function FeaturedSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-[248px] w-[46%] flex-none animate-pulse rounded-2xl bg-[#41362D]/15 sm:w-56"
        />
      ))}
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation("shop");
  const { t: tf } = useTranslation("shopflow");
  const navigate = useNavigate();

  const { totalItems, totalPrice } = useCart();

  const { reveal } = useReveal();

  const { authChecked, isLoadingAuth, isLoadingPublicSettings } = useAuth();

  const [showSplash, setShowSplash] = useState(
    () => !sessionStorage.getItem("gh_splash_shown"),
  );
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);
  const [bootstrapReleased, setBootstrapReleased] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState(0);
  const [highlightsPaused, setHighlightsPaused] = useState(false);
  const [highlightDragX, setHighlightDragX] = useState(0);
  const highlightTouchStartX = useRef(null);
  const highlightDragXRef = useRef(0);
  const blockHighlightClick = useRef(false);

  const [searchText, setSearchText] = useState("");
  const [livestock, setLivestock] = useState(/** @type {any[]} */ ([]));
  const [livestockLoading, setLivestockLoading] = useState(true);
  const [livestockError, setLivestockError] = useState(false);

  const sessionReady =
    authChecked && !isLoadingAuth && !isLoadingPublicSettings;

  const loadFeatured = useCallback(() => {
    setLivestockLoading(true);
    setLivestockError(false);
    loadLivestockWithFarmers()
      .then((items) => setLivestock(Array.isArray(items) ? items : []))
      .catch(() => setLivestockError(true))
      .finally(() => setLivestockLoading(false));
  }, []);

  useEffect(() => {
    loadFeatured();
  }, [loadFeatured]);

  // Featured listings first, then the newest ones.
  const featured = useMemo(
    () =>
      livestock
        .filter((item) => !isProductExpired(item))
        .sort((a, b) => {
          if (Boolean(b.isFeatured) !== Boolean(a.isFeatured)) return b.isFeatured ? 1 : -1;
          return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
        })
        .slice(0, FEATURED_LIMIT),
    [livestock],
  );
  const availableCount = useMemo(
    () => livestock.filter((item) => !isProductExpired(item)).length,
    [livestock],
  );

  useEffect(() => {
    if (sessionReady) return undefined;
    const timer = window.setTimeout(
      () => setBootstrapReleased(true),
      BOOTSTRAP_FAILSAFE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [sessionReady]);

  useEffect(() => {
    if (showSplash) {
      sessionStorage.setItem("gh_splash_shown", "1");
    }
  }, [showSplash]);

  useEffect(() => {
    const allowSplashAfterReload = () => {
      sessionStorage.removeItem("gh_splash_shown");
    };
    window.addEventListener("beforeunload", allowSplashAfterReload);
    return () =>
      window.removeEventListener("beforeunload", allowSplashAfterReload);
  }, []);

  useEffect(() => {
    if (highlightsPaused) return undefined;
    const timer = window.setInterval(() => {
      setActiveHighlight((current) => (current + 1) % HIGHLIGHTS.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [highlightsPaused]);

  useEffect(() => {
    if (
      showSplash &&
      splashAnimationDone &&
      (sessionReady || bootstrapReleased)
    ) {
      setShowSplash(false);
    }
  }, [
    bootstrapReleased,
    sessionReady,
    showSplash,
    splashAnimationDone,
  ]);

  const handleHighlightTouchStart = (event) => {
    highlightTouchStartX.current = event.touches[0]?.clientX ?? null;
    highlightDragXRef.current = 0;
    blockHighlightClick.current = false;
    setHighlightsPaused(true);
  };

  const handleHighlightTouchMove = (event) => {
    if (highlightTouchStartX.current === null) return;
    const currentX = event.touches[0]?.clientX;
    if (currentX === undefined) return;
    const distance = currentX - highlightTouchStartX.current;
    const clampedDistance = Math.max(-90, Math.min(90, distance));
    highlightDragXRef.current = clampedDistance;
    setHighlightDragX(clampedDistance);
    if (Math.abs(distance) > 10) blockHighlightClick.current = true;
  };

  const handleHighlightTouchEnd = () => {
    const swipeDistance = highlightDragXRef.current;
    if (Math.abs(swipeDistance) >= 45) {
      setActiveHighlight((current) =>
        swipeDistance < 0
          ? (current + 1) % HIGHLIGHTS.length
          : (current - 1 + HIGHLIGHTS.length) % HIGHLIGHTS.length,
      );
    }
    highlightTouchStartX.current = null;
    highlightDragXRef.current = 0;
    setHighlightDragX(0);
    setHighlightsPaused(false);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const query = searchText.trim();
    navigate("/browse", { state: query ? { query } : { focusSearch: true } });
  };

  const quickActionHint = (label) => {
    if (label === "browse" && availableCount > 0) return tf("home.hints.browseCount", { count: availableCount });
    if (label === "cart" && totalItems > 0) return tf("home.hints.cartCount", { count: totalItems });
    return tf(`home.hints.${label}`);
  };

  // Keep the existing launch/transition splash on screen until both the
  // minimum animation and authentication bootstrap have completed.
  if (showSplash || (!sessionReady && !bootstrapReleased)) {
    return (
      <SplashScreen
        duration={SPLASH_DURATION_MS}
        onDone={() => {
          setSplashAnimationDone(true);
        }}
      />
    );
  }

  return (
    <div className="aisyah-page">
      <AppHeader
        eyebrow=""
        title="QURBI"
        titleClassName="text-2xl sm:text-3xl"
        subtitleClassName="text-base"
        search={
          <form role="search" onSubmit={submitSearch} className="flex gap-2">
            <label className="qurbi-search flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border px-3 focus-within:ring-2 focus-within:ring-[#E3C19F]">
              <Search aria-hidden="true" className="h-5 w-5 flex-none text-[#41362D]" />
              <span className="sr-only">{tf("home.searchLabel")}</span>
              <input
                type="search"
                enterKeyHint="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={tf("home.searchPlaceholder")}
                className="min-w-0 flex-1 bg-transparent text-base outline-none"
              />
            </label>
            <button
              type="submit"
              className="flex h-12 flex-none items-center justify-center rounded-2xl bg-[#E3C19F] px-4 text-sm font-bold text-[#41362D] shadow-md transition-transform active:scale-95"
            >
              {tf("home.searchButton")}
            </button>
          </form>
        }
      />

      <ViewCartCard totalItems={totalItems} totalPrice={totalPrice} />

      <div className="mx-auto max-w-5xl space-y-7 px-4 pt-5 sm:px-5">
        {/* ANIMAL CATEGORIES */}
        <section className={reveal()} style={{ animationDelay: "120ms" }} aria-labelledby="home-categories-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="home-categories-title" className="text-lg font-bold text-[#41362D]">
              {t("home.categoriesTitle")}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {HOME_SPECIES.map((label, i) => (
              <Link
                key={label}
                to="/browse"
                state={{ species: label }}
                className={`
                    flex
                    min-h-[88px]
                    w-full
                    items-center
                    justify-center
                    gap-3
                    rounded-2xl
                    qurbi-category-card
                    transition-[translate,box-shadow]
                    duration-300
                    ease-out
                    px-3
                    py-4
                    ${CHIP_TINTS[i % CHIP_TINTS.length]}
                    ${reveal()}
                  `}
                style={{
                  animationDelay: `${160 + i * 50}ms`,
                }}
              >
                <img
                  data-no-contrast-outline
                  src={HOME_SPECIES_IMAGES[label]}
                  alt=""
                  className="h-11 w-11 flex-none object-contain"
                />
                <span className="text-lg font-bold text-white">
                  {t(`home.species.${label.toLowerCase()}`)}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* FEATURED / NEW LIVESTOCK */}
        <section className={reveal()} style={{ animationDelay: "200ms" }} aria-labelledby="home-featured-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 id="home-featured-title" className="text-lg font-bold text-[#41362D]">
                {tf("home.featuredTitle")}
              </h2>
              <p className="text-sm text-[#6B594A]">{tf("home.featuredSubtitle")}</p>
            </div>
            <Link
              to="/browse"
              className="inline-flex min-h-11 flex-none items-center gap-1 rounded-xl px-2 text-sm font-bold text-[#41362D] underline-offset-4 hover:underline"
            >
              {tf("home.seeAll")} <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>

          {livestockLoading && !livestock.length ? (
            <FeaturedSkeleton />
          ) : livestockError && !livestock.length ? (
            <div className="rounded-2xl border border-[#41362D]/20 bg-[#F7EDE2]/80 p-4 text-center">
              <p className="text-sm font-semibold text-[#41362D]">{tf("home.featuredError")}</p>
              <button
                type="button"
                onClick={loadFeatured}
                className="aisyah-primary-button mt-3 inline-flex min-h-11 items-center gap-2"
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" /> {tf("common.retry")}
              </button>
            </div>
          ) : featured.length === 0 ? (
            <div className="rounded-2xl border border-[#41362D]/20 bg-[#F7EDE2]/80 p-4 text-center">
              <p className="text-sm font-semibold text-[#41362D]">{tf("home.featuredEmpty")}</p>
              <Link to="/bulk-buy" className="aisyah-primary-button mt-3 inline-flex min-h-11 items-center">
                {tf("home.featuredEmptyAction")}
              </Link>
            </div>
          ) : (
            <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 sm:-mx-5 sm:px-5">
              {featured.map((item, index) => (
                <div key={item.id} className="w-[46%] flex-none snap-start sm:w-56">
                  <LivestockCard livestock={item} index={index} showFeatured />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* HIGHLIGHTS */}
        <section
          className={`${reveal()} touch-pan-y select-none`}
          style={{ animationDelay: "260ms" }}
          aria-label={t("home.highlightsAriaLabel")}
          onMouseEnter={() => setHighlightsPaused(true)}
          onMouseLeave={() => setHighlightsPaused(false)}
          onTouchStart={handleHighlightTouchStart}
          onTouchMove={handleHighlightTouchMove}
          onTouchEnd={handleHighlightTouchEnd}
          onTouchCancel={handleHighlightTouchEnd}
          onClickCapture={(event) => {
            if (blockHighlightClick.current) {
              event.preventDefault();
              event.stopPropagation();
              blockHighlightClick.current = false;
            }
          }}
          onFocus={() => setHighlightsPaused(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setHighlightsPaused(false);
            }
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#41362D]">
              {t("home.highlightsTitle")}
            </h2>
            <span className="text-sm font-semibold text-[#6B594A]">
              {activeHighlight + 1} / {HIGHLIGHTS.length}
            </span>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/20 shadow-[0_16px_35px_-15px_rgba(65,54,45,0.65),0_6px_14px_-8px_rgba(65,54,45,0.45)] ring-1 ring-[#41362D]/10">
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{
                transform: `translateX(calc(-${activeHighlight * 100}% + ${highlightDragX}px))`,
                transitionDuration: highlightDragX ? "0ms" : undefined,
              }}
            >
              {HIGHLIGHTS.map(
                ({ id, path, icon: Icon, gradient }, index) => (
                  <Link
                    key={id}
                    to={path}
                    viewTransition
                    tabIndex={activeHighlight === index ? 0 : -1}
                    aria-hidden={activeHighlight === index ? undefined : true}
                    className={`relative flex min-h-40 w-full min-w-full items-center gap-4 overflow-hidden bg-gradient-to-br ${gradient} p-5 text-left text-white before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/10 before:to-transparent before:opacity-70 sm:min-h-44 sm:p-6`}
                  >
                    <span className="relative z-10 flex h-14 w-14 flex-none items-center justify-center rounded-2xl border border-white/25 bg-white/10 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.65)] backdrop-blur-sm">
                      <Icon className="h-7 w-7" />
                    </span>
                    <span className="relative z-10 min-w-0 flex-1">
                      <span className="block text-lg font-extrabold leading-tight sm:text-xl">
                        {t(`home.highlights.${id}.title`)}
                      </span>
                      <span className="mt-2 block text-sm leading-relaxed text-white/80">
                        {t(`home.highlights.${id}.description`)}
                      </span>
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#F1DFCD]">
                        {t(`home.highlights.${id}.action`)} <ChevronRight className="h-4 w-4" />
                      </span>
                    </span>
                  </Link>
                ),
              )}
            </div>
          </div>

          <div className="mt-1 flex justify-center">
            {HIGHLIGHTS.map((highlight, index) => (
              <button
                key={highlight.id}
                type="button"
                onClick={() => setActiveHighlight(index)}
                aria-label={t("home.showHighlight", {
                  number: index + 1,
                  title: t(`home.highlights.${highlight.id}.title`),
                })}
                aria-current={activeHighlight === index ? "true" : undefined}
                className="flex h-11 min-w-11 items-center justify-center px-1"
              >
                <span
                  className={`block h-2.5 rounded-full transition-all duration-300 ${
                    activeHighlight === index
                      ? "w-7 bg-[#41362D]"
                      : "w-2.5 bg-[#41362D]/30"
                  }`}
                />
              </button>
            ))}
          </div>
        </section>

        {/* SHORTCUTS (formerly Quick Actions) */}
        <section
          className={reveal()}
          style={{ animationDelay: "320ms" }}
          aria-labelledby="home-shortcuts-title"
        >
          <h2 id="home-shortcuts-title" className="mb-3 text-lg font-bold text-[#41362D]">
            {t("home.quickActionsTitle")}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {QUICK_ACTIONS.map(({ icon: Icon, label, path }) => (
              <Link
                key={label}
                to={path}
                viewTransition
                className="flex min-h-[64px] min-w-0 items-center gap-3 rounded-2xl border border-[#41362D]/15 bg-[#F7EDE2]/85 p-3 text-left transition-colors hover:bg-[#F7EDE2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#41362D]"
              >
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-[#41362D] to-[#6B594A]">
                  <Icon aria-hidden="true" className="h-5 w-5 text-white" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-tight text-[#41362D]">
                    {label === "addresses" ? tf("home.addresses") : t(`home.quickActions.${label}`)}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-[#6B594A]">
                    {quickActionHint(label)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
