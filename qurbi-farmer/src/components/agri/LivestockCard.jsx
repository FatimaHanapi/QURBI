import React from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, RefreshCw, Trash2 } from "lucide-react";
import { Image } from "@/components/ui/image";
import StatusBadge from "@/components/agri/StatusBadge";
import { formatMYR, listingExpiry, listingExpiryLabel, livestockStatusMeta, livestockTitle } from "@/lib/agri";
import { cn } from "@/lib/utils";
import { hasActivePaymentReservation, reservationExpiryLabel } from "@/lib/livestockReservation";

/** One plain sentence telling the farmer where this listing stands. */
function statusNote(livestock, { paymentReserved, listingExpired, daysRemaining }) {
  if (paymentReserved) return { text: `A buyer is paying for this animal. Locked until ${reservationExpiryLabel(livestock)}.`, tone: "text-amber-800" };
  if (listingExpired) return { text: `Expired ${listingExpiryLabel(livestock)}. Buyers can't see it — check the details and renew.`, tone: "text-destructive" };
  switch (livestock.status) {
    case "Available":
      if (daysRemaining === null) return { text: "Buyers will see it for 14 days once published.", tone: "text-muted-foreground" };
      return { text: `Buyers can see it · ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left before renewal`, tone: daysRemaining <= 2 ? "text-amber-800" : "text-muted-foreground" };
    case "Draft": return { text: "Draft — not visible to buyers yet. Edit it and choose “For sale”.", tone: "text-sky-800" };
    case "Unavailable": return { text: "Hidden from buyers. Edit to put it back on sale.", tone: "text-muted-foreground" };
    case "Reserved": return { text: "Reserved by a buyer. Check your orders.", tone: "text-amber-800" };
    case "Sold": return { text: "Sold. No action needed.", tone: "text-muted-foreground" };
    default: return null;
  }
}

/**
 * @param {{ livestock: any, onEdit?: (livestock: any) => void, onDelete?: (livestock: any) => void, onView?: (livestock: any) => void, footerActions?: React.ReactNode, actions?: boolean, compact?: boolean, statusPlacement?: string }} props
 */
export default function LivestockCard({ livestock, onEdit, onDelete, onView, footerActions, actions = true, compact = false, statusPlacement = "image" }) {
  const navigate = useNavigate();
  const paymentReserved = hasActivePaymentReservation(livestock);
  const expiry = listingExpiry(livestock);
  const listingExpired = livestock.status === "Available" && expiry.expired;
  const cover = livestock.coverImage || livestock.images?.[0];
  const title = livestockTitle(livestock);
  const subtitle = [livestock.species, livestock.breed && livestock.breed !== "Unspecified" && livestock.breed !== title ? livestock.breed : ""].filter(Boolean).join(" · ");
  const status = livestockStatusMeta(livestock.status, livestock);
  const note = statusNote(livestock, { paymentReserved, listingExpired, daysRemaining: expiry.daysRemaining });
  const go = () => {
    if (onView) onView(livestock);
    else navigate(`/livestock/${livestock.id}`);
  };
  const edit = () => {
    if (onEdit) onEdit(livestock);
    else navigate(`/livestock/${livestock.id}/edit`);
  };
  const primaryIsRenew = listingExpired && !paymentReserved;

  return (
    <article className={cn(
      "soft-card group overflow-hidden animate-slide-up transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_10px_24px_rgba(65,54,45,0.11)]",
      livestock.disabled && "opacity-65"
    )}>
      <button type="button" onClick={go} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <div className={cn("relative bg-muted", compact ? "aspect-[16/10]" : "aspect-[16/9]")}>
          {cover ? (
            <Image src={cover} fittingType="fill" alt={`${title} photo`} className="h-full w-full" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-medium text-muted-foreground">No photo yet</div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent" aria-hidden="true" />
          {statusPlacement === "image" && <StatusBadge className="absolute left-3 top-3 shadow-sm" tone={status.tone} dot>{status.label}</StatusBadge>}
          {statusPlacement === "image" && livestock.disabled && <StatusBadge className="absolute right-3 top-3 shadow-sm" tone="danger">Disabled by admin</StatusBadge>}
        </div>

        <div className="p-4">
          {statusPlacement === "content" && (
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              <StatusBadge tone={status.tone} dot>{status.label}</StatusBadge>
              {paymentReserved && <StatusBadge tone="warning">Payment in progress</StatusBadge>}
              {livestock.disabled && <StatusBadge tone="danger">Disabled by admin</StatusBadge>}
            </div>
          )}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="line-clamp-2 text-lg font-extrabold leading-snug text-primary">{title}</h2>
              {subtitle && <p className="mt-0.5 truncate text-sm font-medium text-muted-foreground">{subtitle}</p>}
            </div>
            <p className="shrink-0 text-lg font-extrabold tracking-tight text-foreground">{formatMYR(livestock.price)}</p>
          </div>
          {note && <p className={cn("mt-2.5 text-sm font-medium leading-snug", note.tone)}>{note.text}</p>}
        </div>
      </button>

      {(actions || footerActions) && (
        <div className="flex gap-2 border-t border-border/65 bg-muted/20 p-3">
          {actions && <>
            {primaryIsRenew ? (
              <button type="button" onClick={edit} className="brand-gradient flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-white shadow-[0_4px_12px_rgba(65,54,45,0.14)]"><RefreshCw className="h-4 w-4" />Review &amp; renew</button>
            ) : (
              <button type="button" onClick={go} className="brand-gradient flex min-h-11 flex-1 items-center justify-center rounded-2xl px-4 text-sm font-bold text-white shadow-[0_4px_12px_rgba(65,54,45,0.14)]">View details</button>
            )}
            {!paymentReserved && !primaryIsRenew && <button type="button" onClick={edit} aria-label={`Edit ${title}`} title="Edit" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/65 text-primary transition-colors hover:bg-secondary"><Pencil className="h-[18px] w-[18px]" /></button>}
            {onDelete && !paymentReserved && <button type="button" onClick={() => onDelete(livestock)} aria-label={`Delete ${title}`} title="Delete" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-card text-destructive ring-1 ring-destructive/25 transition-colors hover:bg-destructive/10"><Trash2 className="h-[18px] w-[18px]" /></button>}
          </>}
          {footerActions}
        </div>
      )}
    </article>
  );
}
