import React, { useState, useEffect } from "react";
import {
  useParams,
  Link,
  useSearchParams,
} from "react-router-dom";
import {
  ShoppingCart,
  Check,
  MapPin,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  Zap,
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
import {
  animateProductToCart,
  captureCartAnimationSource,
} from "@/lib/cart-animation";

function AvailabilityModal({ state, onClose, onBrowse, backLabel }) {
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
            ? "Livestock Unavailable"
            : "Unable to Verify Availability"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          {unavailable
            ? "This livestock is no longer available for purchase. Please browse other available livestock."
            : "We couldn't verify this livestock right now. Please try again."}
        </p>
        <button
          type="button"
          onClick={unavailable ? onBrowse : onClose}
          className="mt-5 min-h-11 w-full rounded-xl bg-[#F7EDE2]0 px-4 text-sm font-bold text-white"
        >
          {unavailable ? backLabel : "Close"}
        </button>
      </div>
    </div>
  );
}

export default function LivestockDetail() {
  const { id } = useParams();
  const { navigateWithTransition, completeProductTransition } = useHeaderTransition();
  const [searchParams] = useSearchParams();
  const openedFromCart = searchParams.get("from") === "cart";
  const returnPath = openedFromCart ? "/cart" : "/browse";
  const returnLabel = openedFromCart ? "Back to Cart" : "Back to Browse";
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
      .catch((e) => setError(e.message || "Failed to load livestock"))
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
        alert("This item is already in your cart.");
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
        message="Loading livestock details..."
        backTo={returnPath}
        backLabel={returnLabel}
      />
    );
  }

  if (error) {
    return (
      <div className="aisyah-page flex flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-gray-600 font-semibold text-center">
          Failed to load livestock
        </p>
        <p className="text-gray-400 text-sm text-center max-w-xs">{error}</p>
        <button
          onClick={load}
          className="bg-[#F7EDE2]0 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
        <Link to={returnPath} className="text-[#F7EDE2]0 text-sm font-semibold">
          ← {returnLabel}
        </Link>
      </div>
    );
  }

  if (!livestock) return null;

  const statusLabel = String(livestock.status || "Unavailable").trim();
  const isAvailableStatus = statusLabel.toLowerCase() === "available";
  const allImages = [livestock.coverImage, ...(livestock.images || [])].filter(
    Boolean,
  );
  const videos = livestock.videos || [];

  const infoItems = [
    { label: "Species", value: livestock.species },
    { label: "Breed", value: livestock.breed },
    { label: "Gender", value: livestock.gender },
    { label: "Age", value: livestock.age },
    {
      label: "Weight",
      value: livestock.weight ? `${livestock.weight} kg` : null,
    },
    {
      label: "Height",
      value: livestock.height ? `${livestock.height} cm` : null,
    },
    {
      label: "Body Length",
      value: livestock.bodyLength ? `${livestock.bodyLength} cm` : null,
    },
    {
      label: "Chest Girth",
      value: livestock.chestGirth ? `${livestock.chestGirth} cm` : null,
    },
    { label: "Color", value: livestock.color },
    { label: "Ear Tag", value: livestock.earTag },
    { label: "RFID", value: livestock.rfid },
  ].filter((i) => i.value);

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
          className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-[#F7EDE2]/60 bg-[#41362D]/80 text-white shadow-lg backdrop-blur-sm active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white drop-shadow">
            QURBI
          </p>
        </div>
        {allImages.length > 0 ? (
          <button
            type="button"
            onClick={() => setPreviewImage(allImages[activeImage])}
            className="block w-full h-72"
          >
            <img
              data-cart-product-image
              src={allImages[activeImage]}
              alt={livestock.breed}
              className="w-full h-full object-cover"
            />
          </button>
        ) : (
          <div className="flex h-72 w-full items-center justify-center bg-[#F7EDE2] text-sm font-bold text-[#41362D]">
            {livestock.species || "Livestock"}
          </div>
        )}
      </div>

      <DetailOuterSheet raised={detailsRaised}>
        {allImages.length > 1 && (
          <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto rounded-2xl bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] p-2">
            {allImages.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImage(idx)}
                className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200 ease-out active:scale-[0.98] ${activeImage === idx ? "border-[#41362D]" : "border-[#E3C19F]"}`}
              >
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {videos.length > 0 && (
          <section className="mb-5" aria-labelledby="livestock-videos-title">
            <h2
              id="livestock-videos-title"
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

        {/* Title + price + add to cart */}
        <div className={reveal()} style={{ animationDelay: "80ms" }}>
          <div className="mb-2 flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
              {livestock.breed}
            </h1>
          </div>
          <div className="space-y-3">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <p className="min-w-0 text-3xl font-extrabold text-white sm:text-4xl">
                RM {(livestock.price || 0).toLocaleString()}
              </p>
              <span
                className="max-w-[42%] flex-none truncate rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm"
                style={{
                  backgroundColor: isAvailableStatus ? "#16a34a" : "#dc2626",
                }}
                title={statusLabel}
              >
                {statusLabel}
              </span>
            </div>
            <div className="grid w-full grid-cols-2 gap-2">
              <button
                onClick={handleAddToCart}
                disabled={isInCart}
                className={`min-w-0 w-full px-3 py-3.5 rounded-2xl border border-[#F7EDE2]/60 font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 ease-out active:scale-[0.98] ${
                  isInCart
                    ? "bg-[#E3C19F] text-[#5A493C]" 
                    : "bg-gradient-to-br from-[#41362D] to-[#6B594A] text-white shadow-md shadow-black/20 transition-all duration-200 ease-out hover:scale-[1.02]"
                }`}
              >
                {isInCart ? (
                  <>
                    <Check className="w-4 h-4" /> In Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" /> Add
                  </>
                )}
              </button>
              <button
                onClick={handleBuyNow}
                className="mx-auto flex w-full min-w-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] px-3 py-3.5 text-sm font-bold text-black transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]"
              >
                <Zap className="w-4 h-4" /> Buy Now
              </button>
            </div>
          </div>
        </div>

        {/* Location */}
        {livestock.farmLocation && <LightDetailCard title="Location" className={reveal()}>
          <div className="space-y-4" style={{ animationDelay: "140ms" }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#F7EDE2]/60 bg-gradient-to-br from-[#41362D] to-[#6B594A]">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-black/70">
                    Farm Location
                  </p>
                  <p className="text-base font-bold text-black">
                    {livestock.farmLocation}
                  </p>
                </div>
              </div>
          </div>
        </LightDetailCard>}

        {/* Info grid */}
        <LightDetailCard title="Livestock Details" className={reveal()}>
          <div
            className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2"
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

        {/* Health records */}
        {(livestock.healthRecord || livestock.vaccinationRecord) && (
          <div
            className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2 ${reveal()}`}
            style={{ animationDelay: "260ms" }}
          >
            <h3 className="text-gray-900 font-bold">Health & Records</h3>
            {livestock.healthRecord && (
              <div>
                <p className="text-gray-400 text-xs">Health Record</p>
                <p className="text-gray-700 text-sm">
                  {livestock.healthRecord}
                </p>
              </div>
            )}
            {livestock.vaccinationRecord && (
              <div>
                <p className="text-gray-400 text-xs">Vaccination</p>
                <p className="text-gray-700 text-sm">
                  {livestock.vaccinationRecord}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {(livestock.description || livestock.specialNotes) && (
          <div
            className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2 ${reveal()}`}
            style={{ animationDelay: "320ms" }}
          >
            <h3 className="text-gray-900 font-bold">Notes</h3>
            {livestock.description && (
              <p className="text-gray-600 text-sm">{livestock.description}</p>
            )}
            {livestock.specialNotes && (
              <div>
                <p className="text-gray-400 text-xs">Special Notes</p>
                <p className="text-gray-600 text-sm">
                  {livestock.specialNotes}
                </p>
              </div>
            )}
          </div>
        )}
      </DetailOuterSheet>

      <ImageLightbox
        image={previewImage}
        alt={livestock.breed}
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
