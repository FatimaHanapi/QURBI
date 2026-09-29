import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import {
  compactBreedGenderLabel,
  getBreedGenderBreakdown,
} from "@/lib/bulk-listing";

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
  const [listings, setListings] = useState([]);
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { addToCart, buyNow } = useCart();
  const requireAuth = useRequireAuth();
  const { navigateWithTransition } = useHeaderTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setListings(await loadBulkListings());
    } catch (requestError) {
      setError(requestError.message || "Unable to load bulk lots.");
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
          `${listing.name || ""} ${listing.farmer_name || ""} ${listing.state || ""} ${(listing.breedBreakdown || []).map((breed) => (typeof breed === "string" ? breed : breed.breed || breed.name || "")).join(" ")}`.toLowerCase();
        return text.includes(query.toLowerCase());
      }),
    [listings, query, state],
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
          alert("This bulk lot is no longer available.");
          await load();
          return;
        }
        const item = toCartItem(listing);
        if (goToCart) {
          buyNow(item);
          navigateWithTransition("/payment");
        } else {
          if (!addToCart(item)) {
            alert("This bulk lot is already in your cart.");
            return;
          }
          animateProductToCart(animationSource);
        }
      } catch {
        alert("We couldn't verify this bulk lot. Please try again.");
      }
    });
  };

  return (
    <div className="aisyah-page pb-28">
      <AppHeader
        sticky
        thresholdShrink
        title="Bulk Buy"
        subtitle="Purchase complete livestock lots from trusted farmers."
        search={
          <label className="qurbi-search flex h-11 items-center gap-2 rounded-2xl border px-3 transition-all duration-200 ease-out focus-within:ring-2 focus-within:ring-[#E3C19F]">
            <Search className="h-4 w-4 text-black" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search lots, farmer or location"
              className="min-w-0 flex-1 bg-transparent text-sm text-black outline-none placeholder:text-black/70"
            />
          </label>
        }
      >
        <div className="horizontal-filter-scroll no-scrollbar flex max-w-full gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setState("")}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${!state ? "bg-[#E3C19F] text-[#41362D]" : "bg-white/10 text-white/80"}`}
          >
            All lots
          </button>
          {states.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setState(item)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${state === item ? "bg-[#E3C19F] text-[#41362D]" : "bg-white/10 text-white/80"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </AppHeader>

      <main className="aisyah-content grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading && !listings.length && (
          <PageLoading contentOnly message="Loading bulk lots..." />
        )}

        {error && (
          <div className="py-16 text-center">
            <p className="text-sm text-[#6B594A]">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-3 aisyah-primary-button"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="py-16 text-center">
            <Package className="mx-auto h-10 w-10 text-black/70" />
            <p className="mt-3 text-sm text-[#6B594A]">
              No available bulk lots found.
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          visible.map((listing) => {
            const image = listing.coverImage || listing.images?.[0];
            const total = lotTotal(listing);
            const breedBreakdown = getBreedGenderBreakdown(listing);
            return (
              <article
                data-cart-product
                key={listing.id}
                className="aisyah-card overflow-hidden transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.99]"
              >
                <Link
                  to={`/bulk-buy/${encodeURIComponent(listing.id)}`}
                  className="flex gap-3 p-3"
                >
                  <div className="h-24 w-24 flex-none overflow-hidden rounded-xl bg-[#F7EDE2]">
                    {image ? (
                      <img
                        data-cart-product-image
                        src={image}
                        alt={listing.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-bold text-[#41362D]">
                        Bulk lot
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="truncate font-bold text-white">
                        {listing.name}
                      </h2>

                      <span className="rounded-full bg-[#E3C19F] px-2 py-1 text-[10px] font-bold text-black">
                        Available
                      </span>
                    </div>

                    <p className="mt-1 flex items-center gap-1 text-xs text-white/70">
                      <MapPin className="h-3 w-3" />
                      {listing.state || "Location not specified"}
                    </p>

                    <p className="mt-1 flex items-center gap-1 text-xs text-white/70">
                      <Users className="h-3 w-3" />
                      {total} animals · {listing.maleCount || 0} male ·{" "}
                      {listing.femaleCount || 0} female
                    </p>

                    {breedBreakdown.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {breedBreakdown.slice(0, 2).map((row) => (
                          <p key={row.key} className="truncate text-[11px] font-semibold text-[#F7EDE2]" title={compactBreedGenderLabel(row)}>
                            {compactBreedGenderLabel(row)}
                          </p>
                        ))}
                        {breedBreakdown.length > 2 && (
                          <p className="text-[10px] font-semibold text-white/60">+{breedBreakdown.length - 2} more breed group{breedBreakdown.length - 2 === 1 ? "" : "s"}</p>
                        )}
                      </div>
                    )}

                    <p className="mt-2 text-lg font-bold text-white">
                      RM {Number(listing.totalPrice || 0).toLocaleString()}
                    </p>
                  </div>
                </Link>

                <div className="grid grid-cols-2 gap-2 border-t border-[#E3C19F]/50 p-3">
                  <Link
                    to={`/bulk-buy/${encodeURIComponent(listing.id)}`}
                    className="aisyah-secondary-button py-2.5 text-center"
                  >
                    View Details
                  </Link>

                  <button
                    type="button"
                    onClick={(event) =>
                      addLot(listing, true, event.currentTarget)
                    }
                    className="aisyah-primary-button border border-[#F7EDE2]/60 py-2.5"
                  >
                    Buy Now
                  </button>
                </div>
              </article>
            );
          })}
      </main>
    </div>
  );
}
