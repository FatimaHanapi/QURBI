import React, { useState, useEffect } from "react";
import {
  useParams,
  Link,
  useSearchParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ShoppingCart,
  Check,
  MapPin,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  Zap,
  Home,
  User,
  Navigation,
} from "lucide-react";
import { loadLivestockById } from "@/lib/farmerClient";
import { useCart } from "@/lib/cart-context";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useReveal } from "@/hooks/useReveal";
import { checkLivestockAvailability } from "@/lib/livestock-availability";
import ImageLightbox from "@/components/ImageLightbox";
import {
  DarkInfoTile,
  DetailOuterSheet,
  LightDetailCard,
} from "@/components/DetailsSurface";
import DetailPageLoading from "@/components/DetailPageLoading";
import { useHeaderTransition } from "@/components/HeaderTransitionProvider";
import StickyActionBar from "@/components/shop/StickyActionBar";
import StatusChip from "@/components/shop/StatusChip";
import { formatRM } from "@/lib/format";
import {
  ageLabel,
  genderLabel,
  listingState,
  listingTitle,
} from "@/lib/listing-display";
import {
  animateProductToCart,
  captureCartAnimationSource,
} from "@/lib/cart-animation";

function AvailabilityModal({ state, onClose, onBrowse, backLabel }) {
  const { t } = useTranslation("listings");
  if (!state) return null;
  const unavailable = state === "unavailable";
  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/45 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900">
          {unavailable
            ? t("livestockDetail.unavailableTitle")
            : t("livestockDetail.verifyFailTitle")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          {unavailable
            ? t("livestockDetail.unavailableMessage")
            : t("livestockDetail.verifyFailMessage")}
        </p>
        <button
          type="button"
          onClick={unavailable ? onBrowse : onClose}
          className="aisyah-primary-button mt-5 min-h-12 w-full"
        >
          {unavailable ? backLabel : t("livestockDetail.close")}
        </button>
      </div>
    </div>
  );
}

export default function LivestockDetail() {
  const { t } = useTranslation("listings");
  const { t: tf } = useTranslation("shopflow");
  const { id } = useParams();
  const { navigateWithTransition, completeProductTransition } = useHeaderTransition();
  const [searchParams] = useSearchParams();
  const openedFromCart = searchParams.get("from") === "cart";
  const returnPath = openedFromCart ? "/cart" : "/browse";
  const returnLabel = openedFromCart
    ? t("livestockDetail.backToCart")
    : t("livestockDetail.backToBrowse");
  const { addToCart, buyNow, cartItems } = useCart();
  const requireAuth = useRequireAuth();
  const { reveal } = useReveal();
  const [livestock, setLivestock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [previewImage, setPreviewImage] = useState("");
  const [availabilityModal, setAvailabilityModal] = useState("");
  const [detailsRaised, setDetailsRaised] = useState(false);

  const load = () => {
    setLoading(true);
    setLivestock(null);
    setError(null);
    loadLivestockById(id)
      .then(setLivestock)
      .catch((e) => setError(e.message || t("livestockDetail.loadError")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (!loading && (livestock || error)) completeProductTransition();
  }, [completeProductTransition, error, livestock, loading]);

  useEffect(() => {
    const handleScroll = () => setDetailsRaised(window.scrollY > 36);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isInCart = cartItems.some((i) => i.key === id);

  const buildCartItem = () => ({
    id: livestock.id,
    animal: livestock.species,
    breed: livestock.breed,
    title: listingTitle(livestock),
    state: listingState(livestock),
    price_per_head: Number(livestock.price) || 0,
    weight_min: livestock.weight ? Number(livestock.weight) : 0,
    weight_max: livestock.weight ? Number(livestock.weight) : 0,
    farmer_id: livestock.ownerId || livestock.created_by_id || "",
    farmer_name: livestock.farmer_name || "Unknown Farmer",
    image: livestock.coverImage || livestock.images?.[0] || "",
    created_date: livestock.created_date || "",
    listingPublishedAt: livestock.listingPublishedAt || "",
    listingExpiresAt: livestock.listingExpiresAt || "",
    listingRenewedAt: livestock.listingRenewedAt || "",
  });

  const handleAddToCart = (event) => {
    if (!livestock) return;
    const animationSource = captureCartAnimationSource(
      event.currentTarget,
      livestock.coverImage || livestock.images?.[0],
    );
    requireAuth(async () => {
      try {
        const latest = await checkLivestockAvailability([livestock.id]);
        const result = latest[livestock.id];
        if (!result?.available) {
          setAvailabilityModal(
            result?.state === "unavailable" ? "unavailable" : "verification",
          );
          load();
          return;
        }
      } catch {
        setAvailabilityModal("verification");
        return;
      }
      if (!addToCart(buildCartItem())) {
        alert(t("livestockDetail.alreadyInCart"));
      } else {
        animateProductToCart(animationSource);
      }
    });
  };

  const handleBuyNow = (event) => {
    if (!livestock) return;
    const animationSource = captureCartAnimationSource(
      event.currentTarget,
      livestock.coverImage || livestock.images?.[0],
    );
    requireAuth(async () => {
      try {
        const latest = await checkLivestockAvailability([livestock.id]);
        const result = latest[livestock.id];
        if (!result?.available) {
          setAvailabilityModal(
            result?.state === "unavailable" ? "unavailable" : "verification",
          );
          load();
          return;
        }
      } catch {
        setAvailabilityModal("verification");
        return;
      }
      buyNow(buildCartItem());
      animateProductToCart(animationSource);
      navigateWithTransition("/payment");
    });
  };

  if (loading && !livestock) {
    return (
      <DetailPageLoading
        message={t("livestockDetail.loading")}
        backTo={returnPath}
        backLabel={returnLabel}
      />
    );
  }

  if (error) {
    return (
      <div className="aisyah-page flex flex-col items-center justify-center gap-4 p-8">
        <AlertCircle aria-hidden="true" className="h-12 w-12 text-[#6B594A]" />
        <p className="text-center text-lg font-bold text-[#41362D]">
          {t("livestockDetail.loadError")}
        </p>
        <p className="max-w-xs text-center text-sm text-[#6B594A]">{error}</p>
        <button
          type="button"
          onClick={load}
          className="aisyah-primary-button flex min-h-12 items-center gap-2 px-6"
        >
          <RefreshCw className="h-4 w-4" /> {t("livestockDetail.retry")}
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

  if (!livestock) return null;

  const title = listingTitle(livestock, t("livestockDetail.livestockFallback"));
  const allImages = [livestock.coverImage, ...(livestock.images || [])].filter(
    (image, index, images) => image && images.indexOf(image) === index,
  );
  const videos = livestock.videos || [];
  const price = formatRM(livestock.price);
  const listedState = listingState(livestock);

  const infoItems = [
    {
      label: t("livestockDetail.species"),
      value: livestock.species,
    },
    { label: t("livestockDetail.breed"), value: livestock.breed },
    { label: t("livestockDetail.gender"), value: genderLabel(tf, livestock.gender) },
    { label: t("livestockDetail.age"), value: ageLabel(tf, livestock) },
    {
      label: t("livestockDetail.weight"),
      value: livestock.weight ? `${livestock.weight} kg` : null,
    },
    { label: tf("detail.grade"), value: livestock.grade },
    {
      label: t("livestockDetail.height"),
      value: livestock.height ? `${livestock.height} cm` : null,
    },
    {
      label: t("livestockDetail.bodyLength"),
      value: livestock.bodyLength ? `${livestock.bodyLength} cm` : null,
    },
    {
      label: t("livestockDetail.chestGirth"),
      value: livestock.chestGirth ? `${livestock.chestGirth} cm` : null,
    },
    { label: t("livestockDetail.color"), value: livestock.color },
    { label: t("livestockDetail.earTag"), value: livestock.earTag },
    { label: t("livestockDetail.rfid"), value: livestock.rfid },
  ].filter((i) => i.value);

  const farmRows = [
    { icon: MapPin, label: tf("detail.listedIn"), value: listedState },
    { icon: Home, label: tf("detail.farm"), value: livestock.farm_name },
    { icon: User, label: t("livestockDetail.farmer"), value: livestock.farmer_name === "Unknown Farmer" ? "" : livestock.farmer_name },
    { icon: Navigation, label: tf("detail.farmAddress"), value: livestock.farmLocation },
  ].filter((row) => row.value);

  return (
    <div
      data-cart-product
      className="min-h-screen bg-gradient-to-br from-[#41362D] to-[#6B594A]"
    >
      {/* Image gallery */}
      <div
        className={`qurbi-page-header relative bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] ${reveal()}`}
      >
        <button
          type="button"
          onClick={() => navigateWithTransition(returnPath)}
          aria-label={returnLabel}
          className="absolute left-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-xl border border-[#F7EDE2]/60 bg-[#41362D]/80 text-white shadow-lg backdrop-blur-sm active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="pointer-events-none absolute inset-x-0 top-6 z-10 text-center">
          <p className="text-[15px] font-bold uppercase tracking-[0.3em] text-white drop-shadow">
            QURBI
          </p>
        </div>
        {allImages.length > 0 ? (
          <button
            type="button"
            onClick={() => setPreviewImage(allImages[activeImage])}
            aria-label={tf("detail.enlargePhoto")}
            className="block h-72 w-full sm:h-96"
          >
            <img
              data-cart-product-image
              src={allImages[activeImage]}
              alt={title}
              className="h-full w-full object-cover"
            />
          </button>
        ) : (
          <div className="flex h-72 w-full items-center justify-center bg-[#F7EDE2] text-sm font-bold text-[#41362D]">
            {livestock.species || t("livestockDetail.livestockFallback")}
          </div>
        )}
      </div>

      <DetailOuterSheet raised={detailsRaised} withActionBar>
        {allImages.length > 1 && (
          <div className="no-scrollbar mb-1 flex gap-2 overflow-x-auto rounded-2xl bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] p-2">
            {allImages.map((img, idx) => (
              <button
                key={img}
                type="button"
                onClick={() => setActiveImage(idx)}
                aria-label={tf("detail.showPhoto", { number: idx + 1, total: allImages.length })}
                aria-pressed={activeImage === idx}
                className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200 ease-out active:scale-[0.98] ${activeImage === idx ? "border-[#41362D] ring-2 ring-[#41362D]/40" : "border-[#E3C19F] opacity-80"}`}
              >
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Title + price + status */}
        <section className={reveal()} style={{ animationDelay: "80ms" }} aria-labelledby="livestock-title">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white/75">
            {[livestock.species, livestock.breed].filter(Boolean).join(" · ")}
          </p>
          <h1 id="livestock-title" className="mt-1 break-words text-2xl font-extrabold leading-tight text-white sm:text-3xl">
            {title}
          </h1>
          <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 text-3xl font-extrabold text-white sm:text-4xl">
              {price}
            </p>
            <StatusChip status={livestock.status || "unavailable"} />
          </div>
          {listedState && (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-white/85">
              <MapPin aria-hidden="true" className="h-4 w-4" />
              {tf("detail.listedInState", { state: listedState })}
            </p>
          )}
        </section>

        {/* Farm & location */}
        {farmRows.length > 0 && (
          <LightDetailCard title={tf("detail.farmAndLocation")} className={reveal()}>
            <dl className="space-y-3" style={{ animationDelay: "140ms" }}>
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

        {/* Info grid */}
        <LightDetailCard title={t("livestockDetail.livestockDetails")} className={reveal()}>
          <div
            className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-3"
            style={{ animationDelay: "200ms" }}
          >
            {infoItems.map((item) => (
              <DarkInfoTile
                key={item.label}
                label={item.label}
                value={item.value}
              />
            ))}
          </div>
        </LightDetailCard>

        {videos.length > 0 && (
          <section aria-labelledby="livestock-videos-title">
            <h2
              id="livestock-videos-title"
              className="mb-3 text-lg font-extrabold text-white"
            >
              {t("livestockDetail.videos")}
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
                  {t("livestockDetail.videoUnsupported")}
                </video>
              ))}
            </div>
          </section>
        )}

        {/* Health records */}
        {(livestock.healthRecord || livestock.vaccinationRecord) && (
          <LightDetailCard title={t("livestockDetail.healthRecords")} className={reveal()}>
            <div className="space-y-3" style={{ animationDelay: "260ms" }}>
              {livestock.healthRecord && (
                <div>
                  <p className="text-sm font-semibold text-black/70">{t("livestockDetail.healthRecord")}</p>
                  <p className="text-base text-black">{livestock.healthRecord}</p>
                </div>
              )}
              {livestock.vaccinationRecord && (
                <div>
                  <p className="text-sm font-semibold text-black/70">{t("livestockDetail.vaccination")}</p>
                  <p className="text-base text-black">{livestock.vaccinationRecord}</p>
                </div>
              )}
            </div>
          </LightDetailCard>
        )}

        {/* Notes */}
        {(livestock.description || livestock.specialNotes) && (
          <LightDetailCard title={t("livestockDetail.notes")} className={reveal()}>
            <div className="space-y-3" style={{ animationDelay: "320ms" }}>
              {livestock.description && (
                <p className="text-base leading-relaxed text-black">{livestock.description}</p>
              )}
              {livestock.specialNotes && (
                <div>
                  <p className="text-sm font-semibold text-black/70">{t("livestockDetail.specialNotes")}</p>
                  <p className="text-base leading-relaxed text-black">{livestock.specialNotes}</p>
                </div>
              )}
            </div>
          </LightDetailCard>
        )}
      </DetailOuterSheet>

      {/* Primary actions stay reachable above the bottom nav */}
      <StickyActionBar tone="light" label={tf("detail.actionsLabel")} className="gap-2">
        <div className="min-w-0 flex-none">
          <p className="text-xs font-semibold text-[#6B594A]">{tf("detail.price")}</p>
          <p className="whitespace-nowrap text-lg font-extrabold leading-tight text-[#41362D]">{price}</p>
        </div>
        <button
          type="button"
          onClick={isInCart ? () => navigateWithTransition("/cart") : handleAddToCart}
          aria-label={isInCart ? tf("detail.inCartViewAria") : tf("detail.addToCartAria", { title })}
          className="flex min-h-12 flex-none items-center justify-center gap-1.5 rounded-xl border-2 border-[#41362D] bg-[#F7EDE2] px-2.5 text-sm font-bold leading-tight text-[#41362D] transition-all duration-200 ease-out active:scale-[0.98]"
        >
          {isInCart ? (
            <>
              <Check aria-hidden="true" className="h-4 w-4" /> {t("livestockDetail.inCart")}
            </>
          ) : (
            <>
              <ShoppingCart aria-hidden="true" className="h-4 w-4" /> {t("livestockDetail.add")}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          className="flex min-h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-[#41362D] to-[#6B594A] px-3 text-sm font-bold text-white shadow-md shadow-black/20 transition-all duration-200 ease-out active:scale-[0.98]"
        >
          <Zap aria-hidden="true" className="hidden h-4 w-4 flex-none min-[420px]:block" />
          <span className="text-center leading-tight">{t("livestockDetail.buyNow")}</span>
        </button>
      </StickyActionBar>

      <ImageLightbox
        image={previewImage}
        alt={title}
        onClose={() => setPreviewImage("")}
      />
      <AvailabilityModal
        state={availabilityModal}
        onClose={() => setAvailabilityModal("")}
        onBrowse={() => navigateWithTransition(returnPath)}
        backLabel={returnLabel}
      />
    </div>
  );
}
