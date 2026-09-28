import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  X,
  SlidersHorizontal,
  RefreshCw,
  AlertCircle,
  Mars,
  Venus,
} from "lucide-react";
import { loadLivestockWithFarmers } from "@/lib/farmerClient";
import {
  extractState,
  MALAYSIAN_STATES,
} from "@/lib/livestock-data";
import FilterSidebar from "@/components/FilterSidebar";
import { useReveal } from "@/hooks/useReveal";
import AppHeader from "@/components/AppHeader";
import PageLoading from "@/components/PageLoading";
import { isProductExpired } from "@/lib/product-expiry";

function LivestockCard({ livestock, index = 0 }) {
  const navigate = useNavigate();
  const imageReferences = [livestock.coverImage, ...(livestock.images || [])]
    .map((image) => {
      if (typeof image === "string") return image.trim();
      return image?.url || image?.file_url || image?.src || "";
    })
    .filter((image, position, images) => image && images.indexOf(image) === position);
  const [imageIndex, setImageIndex] = useState(0);
  const img = imageReferences[imageIndex] || "";

  useEffect(() => {
    setImageIndex(0);
  }, [livestock.id]);

  const productName = livestock.breed || livestock.name || livestock.species || "Livestock";
  const normalizedGender = String(livestock.gender || "").trim().toLowerCase();
  const isMale = normalizedGender === "male";
  const isFemale = normalizedGender === "female";
  const GenderIcon = isMale ? Mars : isFemale ? Venus : null;
  const locationState = extractState(livestock.farmLocation);
  const displayGrade = livestock.grade || "Grade N/A";

  return (
    <div
      onClick={() => navigate(`/livestock/${livestock.id}`)}
      className="relative min-h-[210px] cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-[#41362D] to-[#6B594A] shadow-lg shadow-[#41362D]/30 animate-fade-in-up active:scale-[0.98] transition-transform sm:min-h-[285px]"
      style={{
        animationDelay: `${Math.min(index * 40, 300)}ms`,
      }}
    >
      <div className="absolute inset-0">
        {img ? (
          <img
            src={img}
            alt={livestock.breed}
            loading="lazy"
            onError={() => setImageIndex((current) => current + 1)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#E3C19F] text-sm font-bold text-[#41362D]">
            {livestock.species || "Livestock"}
          </div>
        )}

        <div className="absolute bottom-[6rem] right-0 z-20 inline-flex max-w-[82%] items-center rounded-l-lg border border-r-0 border-[#41362D] bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] px-2 py-1 text-xs font-bold leading-tight text-[#41362D] shadow-[0_3px_10px_rgba(65,54,45,0.24)] transition-[transform,box-shadow] duration-200 ease-out sm:bottom-[6.25rem] sm:max-w-[72%] sm:px-2.5 sm:text-sm">
          <span className="truncate whitespace-nowrap">{locationState || "Location unavailable"}</span>
        </div>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 h-28 px-2.5 pb-2.5 pt-1.5 text-white sm:h-28 sm:px-4 sm:pb-3 sm:pt-2"
        style={{
          background:
            "linear-gradient(135deg, rgba(65, 54, 45, 0.82), rgba(107, 89, 74, 0.68))",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      >
        <div className="relative flex h-full min-w-0 flex-col justify-start">
          <h2 className="mt-2 min-h-11 min-w-0 break-words pb-1 pr-6 text-lg font-extrabold leading-tight sm:mt-1 sm:min-h-14 sm:pb-1.5 sm:pr-7 sm:text-2xl">
            <span>{productName}</span>
          </h2>
          {GenderIcon && (
            <span
              aria-label={isMale ? "Male" : "Female"}
              className={`absolute right-0 top-4 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-white sm:top-2.5 sm:h-5 sm:w-5 ${
                isMale ? "!text-[#2563EB]" : "!text-[#EC4899]"
              }`}
            >
              <GenderIcon
                aria-hidden="true"
                className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                strokeWidth={3}
              />
            </span>
          )}
          <div className="absolute bottom-7 left-0 right-0 flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden text-xs font-semibold text-white/90 sm:bottom-8 sm:text-sm">
            {livestock.age && (
              <span className="whitespace-nowrap px-1 py-0.5">
                {livestock.age}
              </span>
            )}
            {livestock.age && (
              <span aria-hidden="true">·</span>
            )}
            <span className="whitespace-nowrap px-1 py-0.5">
              {displayGrade}
            </span>
          </div>
          <div
            className="absolute -bottom-2.5 -right-2.5 max-w-[8.5rem] truncate rounded-tl-xl bg-gradient-to-br from-[#41362D] to-[#6B594A] px-2 py-1 text-right text-lg font-extrabold leading-tight text-white shadow-md sm:-bottom-3 sm:-right-4 sm:max-w-[10rem] sm:px-2.5 sm:text-2xl"
            title={`RM ${Number(livestock.price || 0).toLocaleString()}`}
          >
            RM {Number(livestock.price || 0).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Browse() {
  const navigate = useNavigate();
  const location = useLocation();

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

    if (!speciesFromHome) return;

    setActiveSpecies(speciesFromHome);

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
          e.message || "Failed to load livestock",
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
      ].sort(),
    [livestock],
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
      ].sort(),
    [livestock],
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
        extractState(l.farmLocation) !==
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
          new Date(b.created_date) -
          new Date(a.created_date),
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-8">
        {sharedStyles}

        <AlertCircle className="h-12 w-12 text-red-400" />

        <p className="text-center font-semibold text-gray-600">
          Failed to load livestock
        </p>

        <p className="max-w-xs text-center text-sm text-gray-400">
          {error}
        </p>

        <button
          onClick={loadData}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5A493C] to-[#41362D] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#D5B18D] transition-all active:scale-95"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
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
        title="Browse Livestock"
        search={
          <div className="flex gap-2">
            {/* Search */}
            <label className="qurbi-search flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border px-3 focus-within:ring-2 focus-within:ring-[#E3C19F]">
              <Search className="h-4 w-4 flex-none text-[#41362D]" />

              <input
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
                placeholder="Search name, tag, breed, farmer..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchQuery("")
                  }
                  aria-label="Clear search"
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
              aria-label="Open filters"
              className="relative flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-[#E3C19F] text-[#41362D] shadow-md transition-transform active:scale-90"
            >
              <SlidersHorizontal className="h-4 w-4" />

              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#5A493C] px-1 text-[10px] font-bold text-white">
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
              className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all active:scale-95 ${
                activeSpecies === sp
                  ? "bg-[#E3C19F] text-[#41362D] shadow-md"
                  : "bg-white/10 text-white/80"
              }`}
            >
              {sp === "All"
                ? "All"
                : sp}
            </button>
          ))}
        </div>
      </AppHeader>

      {loading && !livestock.length ? (
        <PageLoading contentOnly message="Loading livestock..." />
      ) : (
        <>
          {/* Result count */}
          <div
            className={`flex items-center justify-between px-4 pt-3 ${reveal()}`}
            style={{ animationDelay: "120ms" }}
          >
            <p className="text-xs text-gray-400">
              {`${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Results */}
          <div className="space-y-4 px-4 pt-3">
            {filtered.length === 0 ? (
              <div className="flex animate-fade-in-up flex-col items-center justify-center py-16 text-center">
                <Search className="mb-2 h-10 w-10 text-[#E3C19F]" />
                <p className="text-sm text-gray-400">No livestock found.</p>
                {hasFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="mt-2 text-sm font-semibold text-[#41362D] transition-all active:scale-95" 
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div
                key={`${searchQuery}-${activeSpecies}`}
                className="grid animate-fade-in-up grid-cols-2 gap-3 sm:gap-4"
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
