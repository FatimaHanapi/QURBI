import React, { useEffect, useState } from "react";
import { ExternalLink, FileText, Loader2, Maximize2 } from "lucide-react";
import { uploadApi } from "@/api/apiClient";
import { Image } from "@/components/ui/image";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Resolves a document url; private uploads are fetched with the admin token into a blob url. */
function usePreviewUrl(url) {
  const [state, setState] = useState({ url: "", loading: false, failed: false });
  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;
    if (!url) { setState({ url: "", loading: false, failed: false }); return undefined; }
    if (!String(url).startsWith("/uploads/private/")) { setState({ url, loading: false, failed: false }); return undefined; }
    setState({ url: "", loading: true, failed: false });
    uploadApi.getPrivateFile(url).then((blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setState({ url: objectUrl, loading: false, failed: false });
    }).catch(() => { if (!cancelled) setState({ url: "", loading: false, failed: true }); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url]);
  return state;
}

/**
 * Compact document thumbnail; tap to open full-size in a dialog.
 * @param {{ label: string, url?: string, emptyLabel?: string, aspect?: string, className?: string }} props
 */
export default function DocumentThumb({ label, url, emptyLabel = "Not provided", aspect = "aspect-[4/3]", className }) {
  const preview = usePreviewUrl(url);
  const [open, setOpen] = useState(false);

  return (
    <figure className={cn("min-w-0", className)}>
      <figcaption className="mb-1.5 flex min-w-0 items-center gap-1.5 text-xs font-bold text-foreground/80">
        <FileText className="h-3.5 w-3.5 shrink-0 text-primary/70" />
        <span className="truncate">{label}</span>
      </figcaption>
      {!url ? (
        <div className={cn("flex items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-2 text-center text-xs font-semibold text-muted-foreground", aspect)}>{emptyLabel}</div>
      ) : preview.loading ? (
        <div className={cn("flex items-center justify-center rounded-2xl border border-border bg-muted text-xs text-muted-foreground", aspect)} aria-busy="true"><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Loading…</div>
      ) : preview.failed || !preview.url ? (
        <div className={cn("flex items-center justify-center rounded-2xl border border-destructive/25 bg-destructive/5 px-2 text-center text-xs font-semibold text-destructive", aspect)}>Could not load file</div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Open ${label} full size`}
          className={cn("group relative block w-full overflow-hidden rounded-2xl border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", aspect)}
        >
          <Image src={preview.url} fittingType="fill" alt={label} className="h-full w-full" />
          <span className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white shadow-sm transition-transform group-hover:scale-110">
            <Maximize2 className="h-4 w-4" />
          </span>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto rounded-3xl p-4 sm:p-6">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>Pinch or open in a new tab to zoom in further.</DialogDescription>
          </DialogHeader>
          {preview.url && <img src={preview.url} alt={label} className="max-h-[70vh] w-full rounded-2xl bg-muted object-contain" />}
          {preview.url && (
            <a href={preview.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl px-3 text-sm font-bold text-primary hover:bg-secondary/50">
              <ExternalLink className="h-4 w-4" /> Open in new tab
            </a>
          )}
        </DialogContent>
      </Dialog>
    </figure>
  );
}
