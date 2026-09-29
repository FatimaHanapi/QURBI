import React, { useCallback, useEffect, useState } from "react";
import {
  Link,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Check,
  MapPin,
  RefreshCw,
  ShoppingCart,
  Zap,
  Home,
  User,
  Navigation,
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
import { resolvedBreakdown, useBreedNames } from "@/lib/breed-names";
import StickyActionBar from "@/components/shop/StickyActionBar";
import StatusChip from "@/components/shop/StatusChip";
import { formatRM } from "@/lib/format";
import { statusLabel } from "@/lib/listing-display";

export default function BulkListingDetail() {
  const { t } = useTranslation("listings");
  const { t: tf } = useTranslation("shopflow");
  const { id } = useParams();
  const { navigateWithTransition } = useHeaderTransition();
  const [searchParams] = useSearchParams();
  const openedFromCart = searchParams.get("from") === "cart";
  const returnPath = openedFromCart ? "/cart" : "/bulk-buy";
  const returnLabel = openedFromCart
    ? t("bulkListingDetail.backToCart")
    : t("bulkListingDetail.backToBulkBuy");
  const requireAuth = useRequireAuth();
  const { addToCart, buyNow, cartItems } = useCart();
  const [listing, setListing] = useState(null);
  const [error, setError] = useState("");
  const [detailsRaised, setDetailsRaised] = useState(false);
  const breedNames = useBreedNames(listing ? [listing] : []);

  const load = useCallback(() => {
    setListing(null);
    setError("");
    loadBulkListingById(id)
      .then(setListing)
      .catch((requestError) =>
        setError(requestError.message || t("bulkListingDetail.loadError")),
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
        <p className="text-lg font-bold text-[#41362D]">{t("bulkListingDetail.loadError")}</p>
        <p className="max-w-xs text-sm text-[#6B594A]">{error}</p>
        <button
          type="button"
          onClick={load}
          className="aisyah-primary-button flex min-h-12 items-center gap-2 px-6"
        >
          <RefreshCw className="h-4 w-4" /> {t("bulkListingDetail.retry")}
        </button>
        <Link
          to={returnPath}
          className="inline-flex min-h-11 items-center text-sm font-bold text-[#41362D] underline underline-offset-4"
        >
          {returnLabel}
        </Link>
      </div>
    );
  }

  if (!listing) {
    return (
      <DetailPageLoading
        message={t("bulkListingDetail.loadingDetails")}
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
  const breedBreakdown = resolvedBreakdown(listing, breedNames);
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
          alert(t("bulkListingDetail.lotUnavailable"));
          return;
        }
        if (now) {
          buyNow(item);
          animateProductToCart(animationSource);
          navigateWithTransition("/payment");
        } else {
          if (!addToCart(item)) {
            alert(t("bulkListingDetail.alreadyInCart"));
          } else {
            animateProductToCart(animationSource);
          }
        }
      } catch {
        alert(t("bulkListingDetail.verifyError"));
      }
    });
  };

  const detailItems = [
    {
      label: t("bulkListingDetail.availabilityLabel"),
      value: statusLabel(tf, listing.status) || t("bulkListingDetail.available"),
    },
    { label: t("bulkListingDetail.totalAnimalsLabel"), value: total },
    {
      label: t("bulkListingDetail.maleCountLabel"),
      value: Number(listing.maleCount || 0),
    },
    {
      label: t("bulkListingDetail.femaleCountLabel"),
      value: Number(listing.femaleCount || 0),
    },
    {
      label: t("bulkListingDetail.stateLabel"),
      value: listing.state || t("bulkListingDetail.notSpecified"),
    },
    {
      label: t("bulkListingDetail.quantityLabel"),
      value: t("bulkListingDetail.quantityValue"),
    },
  ];

  const farmRows = [
    { icon: MapPin, label: tf("detail.lotLocation"), value: listing.state },
    { icon: Home, label: tf("detail.farm"), value: listing.farm_name },
    // The bulk-listing API does not return the farmer yet; skip the placeholder.
    { icon: User, label: tf("detail.farmer"), value: listing.farmer_name === "Unknown Farmer" ? "" : listing.farmer_name },
    {
      icon: Navigation,
      label: tf("detail.farmAddress"),
      value: listing.farm_location || listing.farm_address || listing.farm_state,
    },
  ].filter((row) => row.value);
  const price = formatRM(listing.totalPrice);

  return (
    <div
      data-cart-product
      className="min-h-screen bg-gradient-to-br from-[#41362D] to-[#6B594A]"
    >
      <div className="qurbi-page-header relative h-72 overflow-hidden bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] sm:h-96">
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
            alt={listing.name || ""}
            className="h-full w-full max-w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-bold text-[#41362D]">
            {t("bulkListingDetail.bulkLotPlaceholder")}
          </div>
        )}
        <StatusChip status={listing.status || "open"} className="absolute right-4 top-5 z-20 shadow-lg" />
      </div>

      <DetailOuterSheet raised={detailsRaised} withActionBar>
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white/75">
            {tf("detail.bulkEyebrow", { count: total })}
          </p>
          <h1 className="mt-1 break-words text-2xl font-extrabold leading-tight text-white sm:text-3xl">
            {listing.name}
          </h1>
          <p className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
            {price}
          </p>
          <p className="mt-1 text-sm font-semibold text-white/80">
            {t("bulkListingDetail.completeLot")}
          </p>
        </header>

        {farmRows.length > 0 && (
          <LightDetailCard title={tf("detail.farmAndLocation")}>
            <dl className="space-y-3">
              {farmRows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#F7EDE2]/60 bg-gradient-to-br from-[#41362D] to-[#6B594A]">
                    <Icon aria-hidden="true" className="h-5 w-5 text-white" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-sm font-semibold text-black/70">{label}</dt>
                    <dd className="break-words text-base font-bold text-black">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </LightDetailCard>
        )}

        <LightDetailCard title={t("bulkListingDetail.bulkLotDetails")}>
          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-3">
            {detailItems.map((detail) => (
              <DarkInfoTile
                key={detail.label}
                label={detail.label}
                value={detail.value}
              />
            ))}
          </div>

          <div className="mt-5 border-t border-black/10 pt-4">
            <h3 className="text-base font-extrabold text-black">{t("bulkListingDetail.breedGenderBreakdown")}</h3>

            {breedBreakdown.length > 0 ? (
              <div className="mt-3 space-y-3">
                {breedBreakdown.map((row) => (
                  <div key={row.key} className="rounded-2xl bg-gradient-to-br from-[#41362D] to-[#6B594A] p-3 text-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-base font-extrabold text-white">{row.breed}</p>
                        {row.species && <p className="mt-0.5 text-sm font-semibold text-white/80">{row.species}</p>}
                      </div>
                      <span className="shrink-0 rounded-full bg-[#E3C19F] px-2.5 py-1 text-xs font-extrabold text-black">{row.total == null ? t("bulkListingDetail.totalNotRecorded") : t("bulkListingDetail.totalCount", { total: row.total })}</span>
                    </div>

                    {row.hasGenderSplit ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <GenderCount label={t("bulkListingDetail.male")} value={row.maleCount} />
                        <GenderCount label={t("bulkListingDetail.female")} value={row.femaleCount} />
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-medium text-white/85">{t("bulkListingDetail.genderSplitUnavailable")}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-black/5 px-3 py-3 text-sm text-black/70">{t("bulkListingDetail.noBreedBreakdown")}</p>
            )}
          </div>
        </LightDetailCard>

        {listing.description && (
          <LightDetailCard title={tf("detail.aboutLot")}>
            <p className="text-base leading-relaxed text-black">{listing.description}</p>
          </LightDetailCard>
        )}

        {videos.length > 0 && (
          <section aria-labelledby="bulk-listing-videos-title">
            <h2
              id="bulk-listing-videos-title"
              className="mb-3 text-lg font-extrabold text-white"
            >
              {t("bulkListingDetail.videos")}
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
                  {t("bulkListingDetail.videoUnsupported")}
                </video>
              ))}
            </div>
          </section>
        )}
      </DetailOuterSheet>

      <StickyActionBar tone="light" label={tf("detail.actionsLabel")} className="gap-2">
        <div className="min-w-0 flex-none">
          <p className="text-xs font-semibold text-[#6B594A]">{tf("detail.lotPrice")}</p>
          <p className="whitespace-nowrap text-lg font-extrabold leading-tight text-[#41362D]">{price}</p>
        </div>
        <button
          type="button"
          onClick={inCart ? () => navigateWithTransition("/cart") : (event) => verify(false, event.currentTarget)}
          aria-label={inCart ? tf("detail.inCartViewAria") : tf("detail.addToCartAria", { title: listing.name })}
          className="flex min-h-12 flex-none items-center justify-center gap-1.5 rounded-xl border-2 border-[#41362D] bg-[#F7EDE2] px-2.5 text-sm font-bold leading-tight text-[#41362D] transition-all duration-200 ease-out active:scale-[0.98]"
        >
          {inCart ? (
            <>
              <Check aria-hidden="true" className="h-4 w-4" /> {t("bulkListingDetail.inCart")}
            </>
          ) : (
            <>
              <ShoppingCart aria-hidden="true" className="h-4 w-4" /> {tf("detail.add")}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={(event) => verify(true, event.currentTarget)}
          className="flex min-h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-[#41362D] to-[#6B594A] px-3 text-sm font-bold text-white shadow-md shadow-black/20 transition-all duration-200 ease-out active:scale-[0.98]"
        >
          <Zap aria-hidden="true" className="hidden h-4 w-4 flex-none min-[420px]:block" />
          <span className="text-center leading-tight">{t("bulkListingDetail.buyNow")}</span>
        </button>
      </StickyActionBar>
    </div>
  );
}

function GenderCount({ label, value }) {
  return (
    <div className="rounded-xl border border-[#F7EDE2]/80 bg-white/10 px-3 py-2 text-center">
      <p className="text-lg font-extrabold text-white">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wide text-white">{label}</p>
    </div>
  );
}
