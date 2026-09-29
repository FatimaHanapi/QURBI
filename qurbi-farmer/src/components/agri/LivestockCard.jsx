import React from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { Image } from "@/components/ui/image";
import StatusBadge from "@/components/agri/StatusBadge";
import { formatMYR, listingExpiry, listingExpiryLabel } from "@/lib/agri";
import { cn } from "@/lib/utils";
import { hasActivePaymentReservation, reservationExpiryLabel } from "@/lib/livestockReservation";

const STATUS_TONE = {
  Available: "success",
  Reserved: "warning",
  Sold: "muted",
  Sick: "danger",
};

export default function LivestockCard({ livestock, onEdit, onDelete, onView, footerActions, actions = true, compact = false, statusPlacement = "image" }) {
  const navigate = useNavigate();
  const paymentReserved = hasActivePaymentReservation(livestock);
  const expiry = listingExpiry(livestock);
  const listingExpired = livestock.status === "Available" && expiry.expired;
  const cover = livestock.coverImage || livestock.images?.[0];
  const go = () => {
    if (onView) onView(livestock);
    else navigate(`/livestock/${livestock.id}`);
  };
  const edit = () => {
    if (onEdit) onEdit(livestock);
    else navigate(`/livestock/${livestock.id}/edit`);
  };

  return (
    <article className={cn(
      "soft-card group overflow-hidden animate-slide-up transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_10px_24px_rgba(65,54,45,0.11)]",
      livestock.disabled && "opacity-65"
    )}>
      <button type="button" onClick={go} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <div className={cn("relative bg-muted", compact ? "aspect-[16/10]" : "aspect-[16/9]")}>
          {cover ? (
            <Image src={cover} fittingType="fill" alt={`${livestock.species || "Livestock"} listing`} className="h-full w-full" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">No image available</div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent" aria-hidden="true" />
          {statusPlacement === "image" && <StatusBadge className="absolute left-3 top-3 shadow-sm" tone={STATUS_TONE[livestock.status] || "muted"} dot>{livestock.status || "Unknown"}</StatusBadge>}
          {statusPlacement === "image" && livestock.disabled && <StatusBadge className="absolute right-3 top-3 shadow-sm" tone="danger">Disabled</StatusBadge>}
        </div>

        <div className="p-4">
          {statusPlacement === "content" && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusBadge tone={STATUS_TONE[livestock.status] || "muted"} dot>{livestock.status || "Unknown"}</StatusBadge>
              {listingExpired && <StatusBadge tone="danger">Expired</StatusBadge>}
              {livestock.disabled && <StatusBadge tone="danger">Disabled</StatusBadge>}
            </div>
          )}
          {paymentReserved && <p className="mb-3 text-xs font-semibold text-amber-800">Payment reserved until {reservationExpiryLabel(livestock)}</p>}
          {!paymentReserved && livestock.status === "Available" && <p className={cn("mb-3 text-xs font-semibold", listingExpired ? "text-destructive" : "text-muted-foreground")}>{listingExpired ? `Expired ${listingExpiryLabel(livestock)} — update & renew to sell again` : expiry.daysRemaining !== null ? `${expiry.daysRemaining} day${expiry.daysRemaining === 1 ? "" : "s"} left before renewal` : "14-day renewal window will begin when published"}</p>}
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-muted-foreground">{livestock.species || "Livestock"}</p>
              <h2 className="mt-1 truncate text-xl font-extrabold leading-tight text-primary">{livestock.breed || "Unspecified breed"}</h2>
            </div>
            <p className="shrink-0 text-lg font-extrabold tracking-tight text-foreground">{formatMYR(livestock.price)}</p>
          </div>
        </div>
      </button>

      {(actions || footerActions) && (
        <div className="flex gap-2 border-t border-border/65 bg-muted/20 p-3">
          {actions && <>
            <button type="button" onClick={go} className="brand-gradient flex min-h-11 flex-1 items-center justify-center rounded-2xl px-4 text-sm font-bold text-white shadow-[0_4px_12px_rgba(65,54,45,0.14)]">View details</button>
            {!paymentReserved && <button type="button" onClick={edit} aria-label={`Edit ${livestock.breed || "livestock"}`} title="Edit" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/65 text-primary transition-colors hover:bg-secondary"><Pencil className="h-[18px] w-[18px]" /></button>}
            {onDelete && !paymentReserved && <button type="button" onClick={() => onDelete(livestock)} aria-label={`Delete ${livestock.breed || "livestock"}`} title="Delete" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"><Trash2 className="h-[18px] w-[18px]" /></button>}
          </>}
          {footerActions}
        </div>
      )}
    </article>
  );
}
