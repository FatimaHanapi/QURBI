import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Mars, Star, Venus } from "lucide-react";
import { useHeaderTransition } from "@/components/HeaderTransitionProvider";
import { formatRM } from "@/lib/format";
import {
  ageLabel,
  genderKey,
  genderLabel,
  listingState,
  listingTitle,
} from "@/lib/listing-display";

/** Marketplace card for one animal (Browse grid + Home featured row). */
export default function LivestockCard({ livestock, index = 0, className = "", showFeatured = false }) {
  const { t } = useTranslation("shop");
  const { t: tf } = useTranslation("shopflow");
  const { navigateFromProductCard } = useHeaderTransition();
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

  const title = listingTitle(livestock, t("browse.livestockFallback"));
  const speciesLabel = [livestock.species, livestock.breed].filter(Boolean).join(" · ") || t("browse.livestockFallback");
  const gender = genderKey(livestock.gender);
  const GenderIcon = gender === "male" ? Mars : gender === "female" ? Venus : null;
  const state = listingState(livestock);
  const age = ageLabel(tf, livestock);
  const price = formatRM(livestock.price);

  const open = (event) =>
    navigateFromProductCard(`/livestock/${livestock.id}`, event.currentTarget, { image: img, label: title });

  return (
    <button
      type="button"
      onClick={open}
      aria-label={tf("card.openAria", { title, price })}
      className={`group relative flex min-h-[248px] w-full flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-[#41362D] to-[#6B594A] text-left shadow-lg shadow-[#41362D]/30 animate-fade-in-up transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#41362D] active:scale-[0.98] sm:min-h-[300px] ${className}`}
      style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
    >
      <span className="relative block min-h-[128px] w-full flex-1 overflow-hidden bg-[#E3C19F] sm:min-h-[170px]">
        {img ? (
          <img
            src={img}
            alt=""
            loading="lazy"
            onError={() => setImageIndex((current) => current + 1)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#41362D]">
            {livestock.species || t("browse.livestockFallback")}
          </span>
        )}
        <span className="absolute bottom-2 left-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-full border border-[#41362D]/40 bg-[#F7EDE2]/95 px-2 py-1 text-xs font-bold leading-none text-[#41362D] shadow-sm">
          <MapPin aria-hidden="true" className="h-3 w-3 flex-none" />
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
            {state || t("browse.locationUnavailable")}
          </span>
        </span>
        {showFeatured && livestock.isFeatured && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#41362D]/90 px-2 py-1 text-xs font-bold leading-none text-[#F7EDE2]">
            <Star aria-hidden="true" className="h-3 w-3 fill-current" />
            {tf("card.featured")}
          </span>
        )}
      </span>

      <span className="flex min-w-0 flex-col gap-1 px-3 pb-3 pt-2.5 text-white sm:px-4 sm:pb-4">
        <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold uppercase tracking-[0.08em] text-white/75">
          {speciesLabel}
        </span>
        <span className="line-clamp-2 min-h-[2.5rem] break-words text-base font-extrabold leading-tight sm:min-h-[3rem] sm:text-lg">
          {title}
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[13px] font-medium text-white/85 sm:text-sm">
          {GenderIcon && (
            <span className="inline-flex items-center gap-0.5">
              <GenderIcon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
              {genderLabel(tf, livestock.gender)}
            </span>
          )}
          {GenderIcon && age && <span aria-hidden="true">·</span>}
          {age && <span className="whitespace-nowrap">{age}</span>}
          {livestock.grade && (
            <>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap">{tf("card.grade", { grade: livestock.grade })}</span>
            </>
          )}
        </span>
        <span className="mt-1 block text-lg font-extrabold leading-tight text-[#F7EDE2] sm:text-xl">{price}</span>
      </span>
    </button>
  );
}
