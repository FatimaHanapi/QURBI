import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search,
  X,
  SlidersHorizontal,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { loadLivestockWithFarmers } from "@/lib/farmerClient";
import { MALAYSIAN_STATES } from "@/lib/livestock-data";
import FilterSidebar from "@/components/FilterSidebar";
import { useReveal } from "@/hooks/useReveal";
import AppHeader from "@/components/AppHeader";
import PageLoading from "@/components/PageLoading";
import LivestockCard from "@/components/shop/LivestockCard";
import { isProductExpired } from "@/lib/product-expiry";
import {
  genderLabel,
  listingState,
  statusLabel,
} from "@/lib/listing-display";

export default function Browse() {
  const { t } = useTranslation("shop");
  const { t: tf } = useTranslation("shopflow");
  const location = useLocation();
  const searchInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  const [livestock, setLivestock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");

  // Species filter
  const [activeSpecies, setActiveSpecies] = useState("All");

  const [filterBreed, setFilterBreed] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterAge, setFilterAge] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  const { mounted, reveal } = useReveal();

  /*
   * =========================================================
   * RECEIVE SPECIES FILTER FROM HOME
   * =========================================================
   *
   * Home sends:
   *
   * <Link
   *   to="/browse"
   *   state={{ species: "Cow" }}
   * >
   *
   * This sets the Browse species filter without putting
   * anything into the URL.
   */
  useEffect(() => {
    const speciesFromHome = location.state?.species;
    const queryFromHome = location.state?.query;
    const focusFromHome = location.state?.focusSearch;

    if (!speciesFromHome && !queryFromHome && !focusFromHome) return;

    if (speciesFromHome) setActiveSpecies(speciesFromHome);
    if (typeof queryFromHome === "string") setSearchQuery(queryFromHome);
    if (focusFromHome) {
      window.setTimeout(() => searchInputRef.current?.focus(), 350);
    }

    /*
     * Clear the navigation state after reading it.
     * This prevents the filter from being reapplied if
     * Browse is refreshed.
     */
    window.history.replaceState({}, document.title);
  }, [location.state]);

  /*
   * =========================================================
   * LOAD LIVESTOCK
   * =========================================================
   */

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);

    loadLivestockWithFarmers()
      .then(setLivestock)
      .catch((e) =>
        setError(
          e.message || t("browse.error.defaultMessage"),
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /*
   * =========================================================
   * FILTER OPTIONS
   * =========================================================
   */

  const speciesList = useMemo(
    () => [
      "All",
      ...new Set(
        livestock
          .map((l) => l.species)
          .filter(Boolean),
      ),
    ],
    [livestock],
  );

  const breedOptions = useMemo(
    () =>
      [
        ...new Set(
          livestock
            .map((l) => l.breed)
            .filter(Boolean),
        ),
      ].sort(),
    [livestock],
  );

  const genderOptions = useMemo(
    () =>
      [
        ...new Set(
          livestock
            .map((l) => l.gender)
            .filter(Boolean),
        ),
      ]
        .sort()
        .map((value) => ({ value, label: genderLabel(tf, value) })),
    [livestock, tf],
  );

  const ageOptions = useMemo(
    () =>
      [
        ...new Set(
          livestock
            .map((l) => l.age)
            .filter(Boolean),
        ),
      ].sort(),
    [livestock],
  );

  const statusOptions = useMemo(
    () =>
      [
        ...new Set(
          livestock
            .map((l) => l.status)
            .filter(Boolean),
        ),
      ]
        .sort()
        .map((value) => ({ value, label: statusLabel(tf, value) })),
    [livestock, tf],
  );

  const locationOptions = useMemo(
    () => MALAYSIAN_STATES,
    [],
  );

  /*
   * =========================================================
   * FILTER LIVESTOCK
   * =========================================================
   */

  const filtered = useMemo(() => {
    let result = livestock.filter((l) => {
      if (isProductExpired(l)) return false;

      // Species
      if (
        activeSpecies !== "All" &&
        l.species !== activeSpecies
      ) {
        return false;
      }

      // Breed
      if (
        filterBreed &&
        l.breed !== filterBreed
      ) {
        return false;
      }

      // Gender
      if (
        filterGender &&
        l.gender !== filterGender
      ) {
        return false;
      }

      // Age
      if (
        filterAge &&
        l.age !== filterAge
      ) {
        return false;
      }

      // Status
      if (
        filterStatus &&
        l.status !== filterStatus
      ) {
        return false;
      }

      // Location
      if (
        filterLocation &&
        listingState(l) !==
          filterLocation
      ) {
        return false;
      }

      // Minimum price
      if (
        priceMin &&
        (l.price || 0) < Number(priceMin)
      ) {
        return false;
      }

      // Maximum price
      if (
        priceMax &&
        (l.price || 0) > Number(priceMax)
      ) {
        return false;
      }

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();

        const matches =
          (l.name || "")
            .toLowerCase()
            .includes(q) ||
          (l.title || "")
            .toLowerCase()
            .includes(q) ||
          (l.breed || "")
            .toLowerCase()
            .includes(q) ||
          (l.species || "")
            .toLowerCase()
            .includes(q) ||
          (l.earTag || "")
            .toLowerCase()
            .includes(q) ||
          (l.rfid || "")
            .toLowerCase()
            .includes(q) ||
          (l.farmLocation || "")
            .toLowerCase()
            .includes(q) ||
          (l.farmer_name || "")
            .toLowerCase()
            .includes(q) ||
          (l.description || "")
            .toLowerCase()
            .includes(q) ||
          (l.specialNotes || "")
            .toLowerCase()
            .includes(q);

        if (!matches) return false;
      }

      return true;
    });

    /*
     * =======================================================
     * SORT
     * =======================================================
     */

    if (sortBy === "price-asc") {
      result = [...result].sort(
        (a, b) =>
          (a.price || 0) -
          (b.price || 0),
      );
    } else if (sortBy === "price-desc") {
      result = [...result].sort(
        (a, b) =>
          (b.price || 0) -
          (a.price || 0),
      );
    } else {
      result = [...result].sort(
        (a, b) =>
          new Date(b.created_date).getTime() -
          new Date(a.created_date).getTime(),
      );
    }

    return result;
  }, [
    livestock,
    activeSpecies,
    filterBreed,
    filterGender,
    filterAge,
    filterStatus,
    filterLocation,
    priceMin,
    priceMax,
    searchQuery,
    sortBy,
  ]);

  /*
   * =========================================================
   * FILTER COUNTS
   * =========================================================
   */

  const hasFilters =
    activeSpecies !== "All" ||
    filterBreed ||
    filterGender ||
    filterAge ||
    filterStatus ||
    filterLocation ||
    priceMin ||
    priceMax ||
    searchQuery;

  const activeFilterCount = [
    activeSpecies !== "All"
      ? activeSpecies
      : "",
    filterBreed,
    filterGender,
    filterAge,
    filterStatus,
    filterLocation,
    priceMin,
    priceMax,
  ].filter(Boolean).length;

  /*
   * =========================================================
   * CLEAR ALL FILTERS
   * =========================================================
   */

  const clearAllFilters = () => {
    setActiveSpecies("All");
    setFilterBreed("");
    setFilterGender("");
    setFilterAge("");
    setFilterStatus("");
    setFilterLocation("");
    setPriceMin("");
    setPriceMax("");
    setSearchQuery("");
  };

  /*
   * =========================================================
   * STYLES / ANIMATIONS
   * =========================================================
   */

  const sharedStyles = (
    <style>{`
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(12px);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes softPulse {
        0%, 100% {
          box-shadow: 0 0 0 0 rgba(4,120,87,0.35);
        }

        50% {
          box-shadow: 0 0 0 5px rgba(4,120,87,0);
        }
      }

      .animate-fade-in-up {
        animation: fadeInUp 0.45s ease-out both;
      }

      .animate-soft-pulse {
        animation: softPulse 2s ease-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .animate-fade-in-up,
        .animate-soft-pulse {
          animation: none;
        }

        * {
          transition-duration: 0.01ms !important;
        }
      }
    `}</style>
  );

  /*
   * =========================================================
   * ERROR STATE
   * =========================================================
   */

  if (error && !livestock.length) {
    return (
      <div className="aisyah-page flex flex-col items-center justify-center gap-4 p-8">
        {sharedStyles}

        <AlertCircle aria-hidden="true" className="h-12 w-12 text-[#6B594A]" />

        <p className="text-center text-lg font-bold text-[#41362D]">
          {t("browse.error.title")}
        </p>

        <p className="max-w-xs text-center text-sm text-[#6B594A]">
          {error}
        </p>

        <button
          type="button"
          onClick={loadData}
          className="aisyah-primary-button flex min-h-12 items-center gap-2 px-6"
        >
          <RefreshCw className="h-4 w-4" />
          {t("browse.error.retry")}
        </button>
      </div>
    );
  }

  /*
   * =========================================================
   * MAIN UI
   * =========================================================
   */

  return (
    <div className="aisyah-page pb-32">
      {sharedStyles}

      <AppHeader
        sticky
        thresholdShrink
        title={t("browse.headerTitle")}
        search={
          <div className="flex gap-2">
            {/* Search */}
            <label className="qurbi-search flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border pl-3 focus-within:ring-2 focus-within:ring-[#E3C19F]">
              <Search aria-hidden="true" className="h-5 w-5 flex-none text-[#41362D]" />
              <span className="sr-only">{tf("browse.searchLabel")}</span>

              <input
                ref={searchInputRef}
                type="search"
                enterKeyHint="search"
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
                placeholder={t("browse.searchPlaceholder")}
                className="min-w-0 flex-1 bg-transparent py-2 pr-3 text-base outline-none [&::-webkit-search-cancel-button]:hidden"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchQuery("")
                  }
                  aria-label={t("browse.clearSearch")}
                  className="-ml-3 flex h-11 w-11 flex-none items-center justify-center rounded-xl"
                >
                  <X className="h-4 w-4 text-[#41362D]" />
                </button>
              )}
            </label>

            {/* Filter button */}
            <button
              type="button"
              onClick={() =>
                setShowFilters(true)
              }
              aria-label={t("browse.openFilters")}
              className="relative flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-[#E3C19F] text-[#41362D] shadow-md transition-transform active:scale-90"
            >
              <SlidersHorizontal className="h-5 w-5" />

              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#F7EDE2] bg-[#41362D] px-1 text-[11px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        }
      >
        {/* Species filter */}
        <div className="horizontal-filter-scroll no-scrollbar flex max-w-full gap-2 overflow-x-auto pb-1">
          {speciesList.map((sp) => (
            <button
              key={sp}
              type="button"
              onClick={() =>
                setActiveSpecies(sp)
              }
              aria-pressed={activeSpecies === sp}
              className={`min-h-11 flex-shrink-0 rounded-full px-5 text-sm font-semibold transition-all active:scale-95 ${
                activeSpecies === sp
                  ? "bg-[#E3C19F] text-[#41362D] shadow-md"
                  : "border border-white/25 bg-white/10 text-white"
              }`}
            >
              {sp === "All"
                ? t("browse.allSpecies")
                : t(`home.species.${String(sp).toLowerCase()}`, { defaultValue: sp })}
            </button>
          ))}
        </div>
      </AppHeader>

      {loading && !livestock.length ? (
        <PageLoading contentOnly message={t("browse.loadingLivestock")} />
      ) : (
        <>
          {/* Result count */}
          <div
            className={`mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-3 ${reveal()}`}
            style={{ animationDelay: "120ms" }}
          >
            <p className="text-sm font-semibold text-[#41362D]" aria-live="polite">
              {t("browse.resultsCount", { count: filtered.length })}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="min-h-11 rounded-xl px-2 text-sm font-bold text-[#41362D] underline underline-offset-4"
              >
                {t("browse.clearFilters")}
              </button>
            )}
          </div>

          {/* Results */}
          <div className="mx-auto max-w-6xl space-y-4 px-4 pt-3">
            {filtered.length === 0 ? (
              <div className="flex animate-fade-in-up flex-col items-center justify-center py-16 text-center">
                <Search aria-hidden="true" className="mb-3 h-10 w-10 text-[#6B594A]" />
                <p className="text-base font-bold text-[#41362D]">{t("browse.noLivestockFound")}</p>
                <p className="mt-1 max-w-xs text-sm text-[#6B594A]">
                  {hasFilters ? tf("browse.emptyWithFilters") : tf("browse.emptyNoListings")}
                </p>
                {hasFilters ? (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="aisyah-primary-button mt-4 min-h-12 px-6"
                  >
                    {t("browse.clearFilters")}
                  </button>
                ) : (
                  <Link to="/bulk-buy" className="aisyah-primary-button mt-4 inline-flex min-h-12 items-center px-6">
                    {tf("browse.tryBulkBuy")}
                  </Link>
                )}
              </div>
            ) : (
              <div
                key={`${searchQuery}-${activeSpecies}`}
                className="grid animate-fade-in-up grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4"
              >
                {filtered.map((l, idx) => (
                  <LivestockCard
                    key={l.id}
                    livestock={l}
                    index={idx}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Filter Sidebar */}
      <FilterSidebar
        open={showFilters}
        onClose={() =>
          setShowFilters(false)
        }
        resultCount={filtered.length}
        filters={{
          filterBreed,
          setFilterBreed,
          filterGender,
          setFilterGender,
          filterAge,
          setFilterAge,
          filterStatus,
          setFilterStatus,
          filterLocation,
          setFilterLocation,
          priceMin,
          setPriceMin,
          priceMax,
          setPriceMax,
          sortBy,
          setSortBy,
          clearAllFilters,
        }}
        options={{
          breedOptions,
          genderOptions,
          ageOptions,
          statusOptions,
          locationOptions,
        }}
      />
    </div>
  );
}
