import React from "react";
import { ChevronRight, EyeOff, Star } from "lucide-react";
import { Image } from "@/components/ui/image";
import StatusBadge from "@/components/agri/StatusBadge";
import CowSilhouetteIcon from "@/components/agri/CowSilhouetteIcon";
import { formatAge } from "@/lib/agri";
import { cn } from "@/lib/utils";
import { formatPrice, genderLabel, listingTitle, livestockStatusInfo, nameOf } from "@/components/admin/adminFormat";

/** Works with both raw backend rows (species/breed objects) and qurbiClient-normalised rows. */
export function livestockView(item) {
  const flat = { ...(item.attributes || {}), ...item };
  const species = nameOf(item.species, flat.species || "");
  const breed = nameOf(item.breed, "Unspecified");
  let age = formatAge({ ...flat, species, breed });
  if (age === "—" && Number.isFinite(Number(item.ageMonths)) && item.ageMonths !== null) {
    const months = Number(item.ageMonths);
    age = months < 12 ? `${months} mo` : `${Math.floor(months / 12)} yr${months % 12 ? ` ${months % 12} mo` : ""}`;
  }
  return {
    id: item.id,
    title: listingTitle({ ...item, species, breed }),
    species,
    breed,
    gender: genderLabel(item.gender || item.sex),
    age,
    price: formatPrice(item.price),
    status: livestockStatusInfo(item.status),
    hidden: Boolean(item.disabled ?? item.adminBlocked),
    featured: Boolean(item.featured ?? item.isFeatured),
    cover: item.coverImage || item.images?.[0] || "",
    tag: item.tagNumber || flat.earTag || "",
  };
}

/** @param {{ src?: string, className?: string }} props */
export function LivestockThumb({ src, className }) {
  return (
    <span className={cn("block shrink-0 overflow-hidden rounded-xl bg-muted", className)}>
      {src ? <Image src={src} fittingType="fill" alt="" className="h-full w-full" /> : <span className="flex h-full w-full items-center justify-center text-muted-foreground"><CowSilhouetteIcon className="h-6 w-6" /></span>}
    </span>
  );
}

/** @param {{ view: any, className?: string }} props */
export function LivestockChips({ view, className }) {
  return (
    <span className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <StatusBadge tone={view.status.tone} dot>{view.status.label}</StatusBadge>
      {view.hidden && <StatusBadge tone="danger"><EyeOff className="h-3.5 w-3.5" />Hidden</StatusBadge>}
      {view.featured && <StatusBadge tone="primary"><Star className="h-3.5 w-3.5" />Featured</StatusBadge>}
    </span>
  );
}

/**
 * Compact, scannable livestock row.
 * @param {{ item: any, onOpen: () => void, footer?: React.ReactNode, className?: string }} props
 */
export default function AdminLivestockRow({ item, onOpen, footer, className }) {
  const view = livestockView(item);
  return (
    <article className={cn("soft-card overflow-hidden", view.hidden && "bg-muted/30", className)}>
      <button type="button" onClick={onOpen} className="flex w-full min-w-0 items-center gap-3 p-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <LivestockThumb src={view.cover} className={cn("h-[72px] w-[72px]", view.hidden && "opacity-60")} />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-start gap-1">
            <span className="line-clamp-2 min-w-0 flex-1 text-[15px] font-extrabold leading-snug text-foreground">{view.title}</span>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </span>
          <span className="mt-0.5 block truncate text-xs font-medium text-muted-foreground">{[view.species, view.breed, view.gender, view.age].filter(Boolean).join(" · ")}</span>
          <span className="mt-1.5 flex min-w-0 items-center justify-between gap-2">
            <LivestockChips view={view} className="min-w-0" />
            <span className="shrink-0 text-[15px] font-extrabold tabular-nums text-foreground">{view.price}</span>
          </span>
        </span>
      </button>
      {footer && <div className="flex gap-2 border-t border-border/60 bg-muted/20 p-2.5">{footer}</div>}
    </article>
  );
}
