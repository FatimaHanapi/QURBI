import React, { useCallback, useEffect, useState } from "react";
import {
  Link,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  Check,
  MapPin,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import { loadBulkListingById } from "@/lib/farmerClient";
import { checkBulkListingAvailability } from "@/lib/livestock-availability";
import { useCart } from "@/lib/cart-context";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  DarkInfoTile,
  DetailOuterSheet,
  LightDetailCard,
} from "@/components/DetailsSurface";
import DetailPageLoading from "@/components/DetailPageLoading";
import { useHeaderTransition } from "@/components/HeaderTransitionProvider";
import {
  animateProductToCart,
  captureCartAnimationSource,
} from "@/lib/cart-animation";
import { getBreedGenderBreakdown } from "@/lib/bulk-listing";

export default function BulkListingDetail() {
  const { id } = useParams();
  const { navigateWithTransition } = useHeaderTransition();
  const [searchParams] = useSearchParams();
  const openedFromCart = searchParams.get("from") === "cart";
  const returnPath = openedFromCart ? "/cart" : "/bulk-buy";
  const returnLabel = openedFromCart ? "Back to Cart" : "Back to Bulk Buy";
  const requireAuth = useRequireAuth();
  const { addToCart, buyNow, cartItems } = useCart();
  const [listing, setListing] = useState(null);
  const [error, setError] = useState("");
  const [detailsRaised, setDetailsRaised] = useState(false);

  const load = useCallback(() => {
    setListing(null);
    setError("");
    loadBulkListingById(id)
      .then(setListing)
      .catch((requestError) =>
        setError(requestError.message || "Unable to load this bulk lot."),
      );
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleScroll = () => setDetailsRaised(window.scrollY > 36);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (error) {
    return (
      <div className="aisyah-page flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-black/70">{error}</p>
        <button
          type="button"
          onClick={load}
          className="aisyah-primary-button flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
        <Link to={returnPath} className="aisyah-primary-button">
          {returnLabel}
        </Link>
      </div>
    );
  }

  if (!listing) {
    return (
      <DetailPageLoading
        message="Loading bulk details..."
        backTo={returnPath}
        backLabel={returnLabel}
      />
    );
  }

  const total = listing.totalAnimals ??
    Number(listing.maleCount || 0) + Number(listing.femaleCount || 0);
  const image = listing.coverImage || listing.images?.[0];
  const videos = listing.videos || [];
  const inCart = cartItems.some((item) => item.key === `bulk:${listing.id}`);
  const breedBreakdown = getBreedGenderBreakdown(listing);
  const item = {
    item_type: "bulk",
    id: listing.id,
    bulk_listing_id: listing.id,
    listing_name: listing.name,
    farmer_id: listing.ownerId || "",
    farmer_name: listing.farmer_name || "Unknown Farmer",
    male_count: Number(listing.maleCount || 0),
    female_count: Number(listing.femaleCount || 0),
    total_animals: total,
    breed_breakdown: listing.breedBreakdown || [],
    state: listing.state || "",
    price_per_head: Number(listing.totalPrice || 0),
    image: image || "",
  };

  const verify = (now, trigger) => {
    const animationSource = captureCartAnimationSource(trigger, image);
    return requireAuth(async () => {
      try {
        const result = await checkBulkListingAvailability([listing.id]);
        if (!result[listing.id]?.available) {
          alert("This bulk lot is no longer available.");
          return;
        }
        if (now) {
          buyNow(item);
          animateProductToCart(animationSource);
          navigateWithTransition("/payment");
        } else {
          if (!addToCart(item)) {
            alert("This bulk lot is already in your cart.");
          } else {
            animateProductToCart(animationSource);
          }
        }
      } catch {
        alert("We couldn't verify this bulk lot. Please try again.");
      }
    });
  };

  const detailItems = [
    { label: "Availability", value: listing.status || "Available" },
    { label: "Total animals", value: total },
    { label: "Male count", value: Number(listing.maleCount || 0) },
    { label: "Female count", value: Number(listing.femaleCount || 0) },
    { label: "State", value: listing.state || "Not specified" },
    { label: "Quantity", value: "1 complete lot" },
  ];

  return (
    <div
      data-cart-product
      className="min-h-screen bg-gradient-to-br from-[#41362D] to-[#6B594A]"
    >
      <div className="qurbi-page-header relative h-72 bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2]">
        <button
          type="button"
          onClick={() => navigateWithTransition(returnPath)}
          aria-label={returnLabel}
          className="absolute left-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-xl border border-[#F7EDE2]/60 bg-gradient-to-br from-[#41362D] to-[#6B594A] text-white shadow-lg shadow-black/20 transition-all duration-200 ease-out active:scale-[0.98]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {image ? (
          <img
            data-cart-product-image
            src={image}
            alt={listing.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-bold text-[#41362D]">
            Bulk lot
          </div>
        )}
        <span className="absolute right-4 top-4 rounded-xl bg-gradient-to-br from-[#41362D] to-[#6B594A] px-4 py-2 text-lg font-extrabold uppercase text-white shadow-lg shadow-black/20">
          {listing.status || "Available"}
        </span>
      </div>

      <DetailOuterSheet raised={detailsRaised}>
        <header>
          <h1 className="break-words text-2xl font-extrabold text-white sm:text-3xl">
            {listing.name}
          </h1>
          <p className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
            RM {Number(listing.totalPrice || 0).toLocaleString()}
          </p>
          <p className="mt-1 text-sm font-semibold text-white/70">
            Complete lot · Quantity fixed at 1
          </p>
        </header>

        {videos.length > 0 && (
          <section aria-labelledby="bulk-listing-videos-title">
            <h2
              id="bulk-listing-videos-title"
              className="mb-3 text-lg font-extrabold text-white"
            >
              Videos
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {videos.map((url, index) => (
                <video
                  key={`${url}-${index}`}
                  src={url}
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full rounded-2xl border border-[#F7EDE2]/30 bg-black shadow-lg shadow-black/20"
                >
                  Your browser does not support video playback.
                </video>
              ))}
            </div>
          </section>
        )}

        <LightDetailCard title="Location">
          <div>
            <p className="flex items-start gap-3 text-base font-bold text-black">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-black" />
              <span className="break-words">
                {listing.farm_location ||
                  listing.farm_address ||
                  listing.farm_state ||
                  listing.state ||
                  "Location not specified"}
              </span>
            </p>
          </div>
        </LightDetailCard>

        <LightDetailCard title="Bulk Lot Details">
          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
            {detailItems.map((detail) => (
              <DarkInfoTile
                key={detail.label}
                label={detail.label}
                value={detail.value}
              />
            ))}
          </div>

          <div className="mt-5 border-t border-black/10 pt-4">
            <h3 className="text-base font-extrabold text-black">Breed and gender breakdown</h3>

            {breedBreakdown.length > 0 ? (
              <div className="mt-3 space-y-3">
                {breedBreakdown.map((row) => (
                  <div key={row.key} className="rounded-2xl bg-gradient-to-br from-[#41362D] to-[#6B594A] p-3 text-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-extrabold text-white">{row.breed}</p>
                        {row.species && <p className="mt-0.5 text-[11px] font-semibold text-white">{row.species}</p>}
                      </div>
                      <span className="shrink-0 rounded-full bg-[#E3C19F] px-2.5 py-1 text-xs font-extrabold text-black">{row.total == null ? "Total not recorded" : `${row.total} total`}</span>
                    </div>

                    {row.hasGenderSplit ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <GenderCount label="Male" value={row.maleCount} />
                        <GenderCount label="Female" value={row.femaleCount} />
                      </div>
                    ) : (
                      <p className="mt-2 text-xs font-medium text-white">Gender split is unavailable for this older listing.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-black/5 px-3 py-3 text-sm text-black/60">No breed breakdown was provided.</p>
            )}
          </div>
        </LightDetailCard>

        <div className="grid w-full grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={(event) => verify(false, event.currentTarget)}
            disabled={inCart}
            className="min-w-0 rounded-2xl border border-[#F7EDE2]/60 bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] px-3 py-3.5 text-sm font-bold text-black transition-all duration-200 ease-out active:scale-[0.98] disabled:opacity-50"
          >
            <ShoppingCart className="mr-1 inline h-4 w-4" />
            {inCart ? "In Cart" : "Add to Cart"}
          </button>
          <button
            type="button"
            onClick={(event) => verify(true, event.currentTarget)}
            className="min-w-0 rounded-2xl border border-[#41362D]/60 bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] px-3 py-3.5 text-sm font-bold text-black transition-all duration-200 ease-out active:scale-[0.98]"
          >
            <Check className="mr-1 inline h-4 w-4" /> Buy Now
          </button>
        </div>
      </DetailOuterSheet>
    </div>
  );
}

function GenderCount({ label, value }) {
  return (
    <div className="rounded-xl border border-[#F7EDE2]/80 bg-white/10 px-3 py-2 text-center">
      <p className="text-lg font-extrabold text-white">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-white">{label}</p>
    </div>
  );
}
