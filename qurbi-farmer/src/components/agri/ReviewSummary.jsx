import React from "react";
import { Pencil } from "lucide-react";
import { Image } from "@/components/ui/image";
import { formatDate, formatMYR } from "@/lib/agri";

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-2.5 last:border-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right text-sm font-semibold text-foreground">
        {value || "—"}
      </span>
    </div>
  );
}

/**
 * Summary of a livestock listing before it is submitted.
 * Optional: `title`, `image` (cover photo), `rows` (extra [label, value] pairs), `onEdit`.
 * @param {{ species?: string, breed?: string, price?: any, farmLocation?: string, deliveryMethod?: string, signerName?: string, signedDate?: string, title?: string, image?: string, rows?: Array<[string, React.ReactNode]>, onEdit?: () => void, heading?: React.ReactNode, description?: React.ReactNode }} props
 */
export default function ReviewSummary({ species, breed, price, farmLocation, deliveryMethod, signerName, signedDate, title, image, rows = [], onEdit, heading = "Review summary", description = "Confirm the details below before submitting your listing." }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold tracking-tight">{heading}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {onEdit && (
          <button type="button" onClick={onEdit} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-secondary/70 px-3 text-sm font-bold text-primary hover:bg-secondary">
            <Pencil className="h-4 w-4" /> Edit
          </button>
        )}
      </div>
      {(image || title) && (
        <div className="mb-2 mt-3 flex items-center gap-3 rounded-xl bg-muted/50 p-2.5">
          {image && <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted"><Image src={image} fittingType="fill" alt="Cover photo" className="h-full w-full" /></div>}
          {title && <p className="min-w-0 text-base font-extrabold leading-snug text-primary">{title}</p>}
        </div>
      )}
      <Row label="Species & breed" value={[species, breed].filter(Boolean).join(" · ")} />
      <Row label="Selling price" value={price !== "" && price != null ? formatMYR(Number(price)) : ""} />
      {rows.map(([label, value]) => <Row key={label} label={label} value={value} />)}
      <Row label="State" value={farmLocation} />
      <Row label="Delivery method" value={deliveryMethod} />
      <Row label="Signer name" value={signerName} />
      <Row label="Signed date" value={signedDate ? formatDate(signedDate, signedDate) : ""} />
    </div>
  );
}
