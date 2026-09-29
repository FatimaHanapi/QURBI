import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import FilterDropdown from "@/components/FilterDropdown";

const SORT_OPTIONS = [
  { value: "newest" },
  { value: "price-asc" },
  { value: "price-desc" },
];

export default function FilterSidebar({ open, onClose, filters, options, resultCount }) {
  const { t } = useTranslation("shop");
  const { t: tf } = useTranslation("shopflow");
  const {
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
  } = filters;

  useEffect(() => {
    if (!open) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onClose]);

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[55] bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-sidebar-title"
        className={`fixed top-0 right-0 bottom-0 z-[60] w-[88%] max-w-sm bg-gradient-to-br from-[#F7EDE2] to-[#E3C19F] shadow-2xl shadow-[#41362D]/20 transition-[transform,visibility] duration-300 flex flex-col ${
          open ? "visible translate-x-0" : "invisible translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E3C19F] flex-shrink-0 bg-gradient-to-br from-[#41362D] to-[#6B594A]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-white" />
            <h2 id="filter-sidebar-title" className="text-white font-bold text-lg">{t("filterSidebar.title")}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-4 h-11 rounded-full border border-[#E3C19F] bg-white/10 text-white font-bold text-sm flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {t("filterSidebar.clear")}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={tf("filters.close")}
              className="w-11 h-11 bg-white/10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overscroll-y-contain overflow-y-auto px-5 py-4 space-y-5 touch-pan-y">
          {/* Sort */}
          <FilterDropdown
            title={t("filterSidebar.filterLabels.sortBy")}
            options={SORT_OPTIONS.map((o) => ({
              value: o.value,
              label: t(`filterSidebar.sortOptions.${o.value}`),
            }))}
            value={sortBy}
            onSelect={setSortBy}
            allowEmpty={false}
          />

          {/* Price Range */}
          <div>
            <h3 id="filter-price-label" className="mb-1.5 text-sm font-bold text-[#41362D]">
              {t("filterSidebar.priceRangeLabel")}
            </h3>
            <div className="flex items-center gap-2" role="group" aria-labelledby="filter-price-label">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                aria-label={tf("filters.minPrice")}
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder={t("filterSidebar.minPlaceholder")}
                className="w-full rounded-2xl border-2 border-[#41362D]/70 bg-[#F7EDE2] px-3.5 py-3 text-sm font-medium text-black transition-all duration-200 focus:border-[#41362D] focus:outline-none focus:ring-4 focus:ring-[#E3C19F]/70"
              />
              <span aria-hidden="true" className="text-[#6B594A] text-sm font-medium">—</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                aria-label={tf("filters.maxPrice")}
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder={t("filterSidebar.maxPlaceholder")}
                className="w-full rounded-2xl border-2 border-[#41362D]/70 bg-[#F7EDE2] px-3.5 py-3 text-sm font-medium text-black transition-all duration-200 focus:border-[#41362D] focus:outline-none focus:ring-4 focus:ring-[#E3C19F]/70"
              />
            </div>
          </div>

          <FilterDropdown
            title={t("filterSidebar.filterLabels.breed")}
            options={options.breedOptions}
            value={filterBreed}
            onSelect={setFilterBreed}
          />
          <FilterDropdown
            title={t("filterSidebar.filterLabels.gender")}
            options={options.genderOptions}
            value={filterGender}
            onSelect={setFilterGender}
          />
          <FilterDropdown
            title={t("filterSidebar.filterLabels.age")}
            options={options.ageOptions}
            value={filterAge}
            onSelect={setFilterAge}
          />
          <FilterDropdown
            title={t("filterSidebar.filterLabels.status")}
            options={options.statusOptions}
            value={filterStatus}
            onSelect={setFilterStatus}
          />
          <FilterDropdown
            title={t("filterSidebar.filterLabels.location")}
            options={options.locationOptions}
            value={filterLocation}
            onSelect={setFilterLocation}
          />
        </div>

        {/* Footer: one clear way back to the results */}
        <div className="flex-shrink-0 border-t border-[#41362D]/15 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="aisyah-primary-button flex min-h-12 w-full items-center justify-center text-base"
          >
            {typeof resultCount === "number"
              ? tf("filters.showResults", { count: resultCount })
              : tf("filters.done")}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
