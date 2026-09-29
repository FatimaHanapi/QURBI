import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPin, Package, Search, Users } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { loadBulkListings } from "@/lib/farmerClient";
import { checkBulkListingAvailability } from "@/lib/livestock-availability";
import { useCart } from "@/lib/cart-context";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import PageLoading from "@/components/PageLoading";
import { useHeaderTransition } from "@/components/HeaderTransitionProvider";
import {
  animateProductToCart,
  captureCartAnimationSource,
} from "@/lib/cart-animation";
import { formatRM } from "@/lib/format";
import { resolvedBreakdown, useBreedNames } from "@/lib/breed-names";
import StatusChip from "@/components/shop/StatusChip";

const lotTotal = (listing) =>
  listing.totalAnimals ??
  Number(listing.maleCount || 0) + Number(listing.femaleCount || 0);

const toCartItem = (listing) => ({
  item_type: "bulk",
  id: listing.id,
  bulk_listing_id: listing.id,
  listing_name: listing.name,
  farmer_id: listing.ownerId || "",
  farmer_name: listing.farmer_name || "Unknown Farmer",
  male_count: Number(listing.maleCount || 0),
  female_count: Number(listing.femaleCount || 0),
  total_animals: lotTotal(listing),
  breed_breakdown: listing.breedBreakdown || [],
  state: listing.state || "",
  price_per_head: Number(listing.totalPrice || 0),
  image: listing.coverImage || listing.images?.[0] || "",
});

export default function BulkBuy() {
  const { t } = useTranslation("listings");
  const { t: tf } = useTranslation("shopflow");
  const [listings, setListings] = useState([]);
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { addToCart, buyNow } = useCart();
  const requireAuth = useRequireAuth();
  const { navigateWithTransition } = useHeaderTransition();
  const breedNames = useBreedNames(listings);

  const breedRowLabel = (row) => {
    if (!row.hasGenderSplit) {
      return row.total == null ? row.breed : tf("bulk.breedTotal", { breed: row.breed, total: row.total });
    }
    return tf("bulk.breedSplit", { breed: row.breed, male: row.maleCount, female: row.femaleCount });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setListings(await loadBulkListings());
    } catch (requestError) {
      setError(requestError.message || t("bulkBuy.loadError"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const states = useMemo(
    () =>
      [
        ...new Set(listings.map((listing) => listing.state).filter(Boolean)),
      ].sort(),
    [listings],
  );

  const visible = useMemo(
    () =>
      listings.filter((listing) => {
        if (state && listing.state !== state) return false;
        const text =
          `${listing.name || ""} ${listing.farmer_name || ""} ${listing.farm_name || ""} ${listing.state || ""} ${resolvedBreakdown(listing, breedNames).map((row) => row.breed).join(" ")}`.toLowerCase();
        return text.includes(query.trim().toLowerCase());
      }),
    [breedNames, listings, query, state],
  );

  const addLot = (listing, goToCart = false, trigger) => {
    const animationSource = captureCartAnimationSource(
      trigger,
      listing.coverImage || listing.images?.[0],
    );
    return requireAuth(async () => {
      try {
        const result = await checkBulkListingAvailability([listing.id]);
        if (!result[listing.id]?.available) {
          alert(t("bulkBuy.lotUnavailable"));
          await load();
          return;
        }
        const item = toCartItem(listing);
        if (goToCart) {
          buyNow(item);
          navigateWithTransition("/payment");
        } else {
          if (!addToCart(item)) {
            alert(t("bulkBuy.alreadyInCart"));
            return;
          }
          animateProductToCart(animationSource);
        }
      } catch {
        alert(t("bulkBuy.verifyError"));
      }
    });
  };

  return (
    <div className="aisyah-page pb-28">
      <AppHeader
        sticky
        thresholdShrink
        title={t("bulkBuy.title")}
        subtitle={t("bulkBuy.subtitle")}
        search={
          <label className="qurbi-search flex h-12 items-center gap-2 rounded-2xl border px-3 transition-all duration-200 ease-out focus-within:ring-2 focus-within:ring-[#E3C19F]">
            <Search aria-hidden="true" className="h-5 w-5 flex-none text-black" />
            <span className="sr-only">{tf("bulk.searchLabel")}</span>
            <input
              type="search"
              enterKeyHint="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("bulkBuy.searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-base text-black outline-none placeholder:text-black/70"
            />
          </label>
        }
      >
        <div className="horizontal-filter-scroll no-scrollbar flex max-w-full gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setState("")}
            aria-pressed={!state}
            className={`min-h-11 flex-none rounded-full px-4 text-sm font-bold ${!state ? "bg-[#E3C19F] text-[#41362D]" : "border border-white/25 bg-white/10 text-white"}`}
          >
            {t("bulkBuy.allLots")}
          </button>
          {states.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setState(item)}
              aria-pressed={state === item}
              className={`min-h-11 flex-none rounded-full px-4 text-sm font-bold ${state === item ? "bg-[#E3C19F] text-[#41362D]" : "border border-white/25 bg-white/10 text-white"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </AppHeader>

      <main className="aisyah-content grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading && !listings.length && (
          <PageLoading contentOnly message={t("bulkBuy.loading")} />
        )}

        {error && (
          <div className="col-span-full py-16 text-center">
            <p className="text-base font-bold text-[#41362D]">{t("bulkBuy.loadError")}</p>
            <p className="mt-1 text-sm text-[#6B594A]">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-4 aisyah-primary-button min-h-12 px-6"
            >
              {t("bulkBuy.retry")}
            </button>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <Package aria-hidden="true" className="mx-auto h-10 w-10 text-[#6B594A]" />
            <p className="mt-3 text-base font-bold text-[#41362D]">
              {t("bulkBuy.noLotsFound")}
            </p>
            {query || state ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setState("");
                }}
                className="mt-4 aisyah-primary-button min-h-12 px-6"
              >
                {tf("bulk.clearSearch")}
              </button>
            ) : (
              <Link to="/browse" className="mt-4 aisyah-primary-button inline-flex min-h-12 items-center px-6">
                {tf("bulk.browseSingle")}
              </Link>
            )}
          </div>
        )}

        {!loading &&
          !error &&
          visible.map((listing) => {
            const image = listing.coverImage || listing.images?.[0];
            const total = lotTotal(listing);
            const breedBreakdown = resolvedBreakdown(listing, breedNames);
            return (
              <article
                data-cart-product
                key={listing.id}
                className="aisyah-card overflow-hidden transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.99]"
              >
                <Link
                  to={`/bulk-buy/${encodeURIComponent(listing.id)}`}
                  className="flex gap-3 p-3"
                  aria-label={tf("bulk.openAria", { title: listing.name, price: formatRM(listing.totalPrice) })}
                >
                  <div className="h-24 w-24 flex-none overflow-hidden rounded-xl bg-[#F7EDE2]">
                    {image ? (
                      <img
                        data-cart-product-image
                        src={image}
                        alt="" 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-bold text-[#41362D]">
                        {t("bulkBuy.bulkLotPlaceholder")}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 break-words text-base font-bold leading-snug text-white">
                      {listing.name}
                    </h2>
                    <StatusChip status={listing.status || "open"} className="mt-1.5" />

                    <p className="mt-2 flex items-center gap-1.5 text-sm text-white/85">
                      <MapPin aria-hidden="true" className="h-4 w-4 flex-none" />
                      {listing.state || t("bulkBuy.locationNotSpecified")}
                    </p>

                    <p className="mt-1 flex items-start gap-1.5 text-sm text-white/85">
                      <Users aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none" />
                      {t("bulkBuy.animalsSummary", {
                        total,
                        male: listing.maleCount || 0,
                        female: listing.femaleCount || 0,
                      })}
                    </p>

                    {breedBreakdown.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {breedBreakdown.slice(0, 2).map((row) => (
                          <p key={row.key} className="break-words text-[13px] font-semibold text-[#F7EDE2]">
                            {breedRowLabel(row)}
                          </p>
                        ))}
                        {breedBreakdown.length > 2 && (
                          <p className="text-[13px] font-semibold text-white/75">
                            {t("bulkBuy.moreBreedGroups", {
                              count: breedBreakdown.length - 2,
                            })}
                          </p>
                        )}
                      </div>
                    )}

                    <p className="mt-2 text-xl font-extrabold text-white">
                      {formatRM(listing.totalPrice)}
                    </p>
                  </div>
                </Link>

                <div className="grid grid-cols-2 gap-2 border-t border-[#E3C19F]/50 p-3">
                  <Link
                    to={`/bulk-buy/${encodeURIComponent(listing.id)}`}
                    className="flex min-h-12 items-center justify-center rounded-xl border-2 border-[#E3C19F]/80 px-3 text-center text-sm font-bold text-white"
                  >
                    {t("bulkBuy.viewDetails")}
                  </Link>

                  <button
                    type="button"
                    onClick={(event) =>
                      addLot(listing, true, event.currentTarget)
                    }
                    className="aisyah-secondary-button min-h-12"
                  >
                    {t("bulkBuy.buyNow")}
                  </button>
                </div>
              </article>
            );
          })}
      </main>
    </div>
  );
}
