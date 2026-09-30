import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CalendarDays, MapPin, Pencil, RefreshCw, Scale, Trash2, Users } from "lucide-react";
import { qurbi } from "@/api/qurbiClient";
import { resolveApiAssetUrl } from "@/api/apiClient";
import ConfirmDialog from "@/components/agri/ConfirmDialog";
import StatusBadge from "@/components/agri/StatusBadge";
import StickyActionBar from "@/components/agri/StickyActionBar";
import { Image } from "@/components/ui/image";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { formatDate, formatMYR } from "@/lib/agri";
import { cn } from "@/lib/utils";

export default function BulkListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError("");
    qurbi.entities.BulkListing.get(id)
      .then(setItem)
      .catch((error) => setLoadError(error?.message || "This bulk listing couldn't be loaded."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const remove = async () => {
    setDeleting(true);
    try {
      await qurbi.entities.BulkListing.delete(id);
      toast({ title: "Bulk listing deleted" });
      navigate("/bulk", { replace: true });
    } catch (error) {
      toast({ title: "Couldn't delete the bulk listing", description: error.message || "Please try again.", variant: "destructive" });
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) return <DetailSkeleton />;
  if (!item) return (
    <div className="py-16 text-center">
      <AlertCircle className="mx-auto h-11 w-11 text-muted-foreground" />
      <p className="mt-3 text-lg font-extrabold">Bulk listing unavailable</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{loadError || "This bulk listing couldn't be loaded."}</p>
      <div className="mt-5 flex justify-center gap-2">
        <button type="button" onClick={() => navigate("/bulk")} className="min-h-11 rounded-2xl bg-card px-4 text-sm font-bold ring-1 ring-border">Back to Bulk sell</button>
        <button type="button" onClick={load} className="brand-gradient flex min-h-11 items-center gap-1.5 rounded-2xl px-4 text-sm font-bold text-white"><RefreshCw className="h-4 w-4" />Try again</button>
      </div>
    </div>
  );

  const images = item.images?.length ? item.images : (item.coverImage ? [item.coverImage] : []);
  const videos = item.videos || [];
  const maleTotal = Number(item.maleCount || 0);
  const femaleTotal = Number(item.femaleCount || 0);
  const breakdown = item.breedBreakdown || [];
  const breakdownTotal = breakdown.reduce((sum, row) => sum + rowTotal(row), 0);
  const total = maleTotal + femaleTotal || breakdownTotal;
  // Older listings store the gender split only on the listing, not per breed group.
  const rowsHaveSplit = breakdown.some((row) => row.maleCount != null || row.femaleCount != null);
  const listingHasSplit = item.maleCount != null || item.femaleCount != null;

  return (
<<<<<<< HEAD
    <div className="mx-auto w-full min-w-0 max-w-6xl animate-fade-in">
=======
    <div className="mx-auto min-w-0 w-full max-w-6xl animate-fade-in overflow-x-hidden">
>>>>>>> upstream/main
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={() => navigate("/bulk")} aria-label="Back to bulk listings" className="soft-card flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Bulk sell</p><h1 className="truncate text-xl font-extrabold tracking-tight">Listing details</h1></div>
        </div>
        <button type="button" onClick={() => navigate(`/bulk/${id}/edit`)} aria-label="Edit bulk listing" className="flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-secondary/70 px-3.5 text-sm font-bold text-primary"><Pencil className="h-4 w-4" /><span className="hidden sm:inline">Edit</span></button>
      </header>

<<<<<<< HEAD
      <div className="mt-5 grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,.92fr)] lg:gap-8">
=======
      <div className="mt-5 grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,.92fr)] lg:gap-8">
>>>>>>> upstream/main
        <div className="min-w-0 space-y-5">
          <section className="soft-card overflow-hidden p-2">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-[1rem] bg-muted sm:aspect-[16/11]">
              {images.length ? <Image src={images[activeImage]} fittingType="fill" alt={`${item.name} photo ${activeImage + 1}`} className="block h-full w-full max-w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No photo yet</div>}
            </div>
            {images.length > 1 && <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto p-1">{images.map((url, index) => <button key={`${url}-${index}`} type="button" onClick={() => setActiveImage(index)} aria-label={`Show photo ${index + 1}`} className={cn("h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-card", index === activeImage ? "ring-primary" : "ring-transparent opacity-70")}><Image src={url} fittingType="fill" alt="" className="h-full w-full object-cover" /></button>)}</div>}
          </section>

          {videos.length > 0 && <section><h2 className="text-lg font-extrabold">Videos</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{videos.map((url, index) => <video key={`${url}-${index}`} src={resolveApiAssetUrl(url)} controls preload="metadata" className="aspect-video w-full rounded-2xl bg-black" />)}</div></section>}
        </div>

        <div className="min-w-0 space-y-5">
          <section className="soft-card p-5 sm:p-6">
<<<<<<< HEAD
            <StatusBadge kind="bulk" status={item.status} dot />
            <h2 className="mt-3 break-words text-2xl font-extrabold leading-tight tracking-tight text-primary">{item.name}</h2>
            <div className="mt-3 flex items-baseline justify-between gap-3 rounded-2xl bg-muted/55 px-4 py-3">
              <p className="text-sm font-semibold text-muted-foreground">Total price</p>
              <p className="text-2xl font-extrabold text-foreground">{formatMYR(item.totalPrice)}</p>
            </div>
            {total > 0 && <p className="mt-2 text-right text-sm text-muted-foreground">About {formatMYR(Math.round(Number(item.totalPrice) / total))} per animal</p>}
            <div className="mt-4 grid grid-cols-3 gap-2.5"><Count label="Animals" value={total} /><Count label="Male" value={listingHasSplit ? maleTotal : "—"} /><Count label="Female" value={listingHasSplit ? femaleTotal : "—"} /></div>
=======
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3"><div className="min-w-0"><StatusBadge tone={STATUS_TONE[item.status] || "muted"} dot>{item.status}</StatusBadge><h2 className="mt-3 truncate text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">{item.name}</h2></div><div className="min-w-0 text-right"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Total price</p><p className="mt-1 whitespace-nowrap text-lg font-extrabold sm:text-xl">{formatMYR(item.totalPrice)}</p></div></div>
            <div className="mt-5 grid grid-cols-3 gap-2.5"><Count label="Animals" value={total} /><Count label="Male" value={item.maleCount || 0} /><Count label="Female" value={item.femaleCount || 0} /></div>
>>>>>>> upstream/main
          </section>

          {item.description && (
            <section className="soft-card p-5">
              <h2 className="text-lg font-extrabold">About this listing</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.description}</p>
            </section>
          )}

          <section className="soft-card divide-y divide-border/60 overflow-hidden">
            {item.state && <InfoRow icon={MapPin} label="State" value={item.state} />}
            {item.estimatedWeightKg && <InfoRow icon={Scale} label="Estimated total weight" value={`${Number(item.estimatedWeightKg).toLocaleString("en-MY")} kg`} />}
            {item.scheduledDate && <InfoRow icon={CalendarDays} label="Slaughter / handover date" value={formatDate(item.scheduledDate)} />}
            {item.closesAt && <InfoRow icon={CalendarDays} label="Orders close" value={formatDate(item.closesAt)} />}
          </section>

          <section className="soft-card p-5">
            <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><h2 className="text-lg font-extrabold">Breed breakdown</h2></div>
            <div className="mt-4 divide-y divide-border/60">
              {breakdown.map((row, index) => (
                <BreedBreakdownRow
                  key={`${row.breed}-${index}`}
                  row={row}
                  species={row.species || item.species}
                  // A single breed group without its own split uses the listing's male/female counts.
                  fallbackSplit={!rowsHaveSplit && breakdown.length === 1 && listingHasSplit ? { male: maleTotal, female: femaleTotal } : null}
                />
              ))}
            </div>
            {!rowsHaveSplit && breakdown.length > 1 && listingHasSplit && (
              <p className="mt-3 rounded-xl bg-muted/55 px-3 py-2.5 text-sm text-muted-foreground">Across all breeds: <strong className="text-foreground">{maleTotal} male</strong>, <strong className="text-foreground">{femaleTotal} female</strong>. The split per breed wasn&apos;t recorded.</p>
            )}
          </section>
        </div>
      </div>

      <StickyActionBar>
        <button type="button" onClick={() => navigate(`/bulk/${id}/edit`)} className="brand-gradient flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-base font-bold text-white"><Pencil className="h-[18px] w-[18px]" />Edit listing</button>
        <button type="button" onClick={() => setConfirmDelete(true)} aria-label="Delete bulk listing" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card text-destructive ring-1 ring-destructive/30 hover:bg-destructive/10"><Trash2 className="h-5 w-5" /></button>
      </StickyActionBar>

      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete this bulk listing?" description={`${item.name} will be removed for good. This can't be undone.`} confirmText="Delete" destructive loading={deleting} onConfirm={remove} />
    </div>
  );
}

function rowTotal(row) {
  const hasSplit = row.maleCount != null || row.femaleCount != null;
  return hasSplit ? Number(row.maleCount || 0) + Number(row.femaleCount || 0) : Number(row.count || 0);
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/70 text-primary"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="break-words text-base font-bold">{value}</p></div>
    </div>
  );
}

function Count({ label, value }) {
  return <div className="rounded-2xl bg-muted/55 p-3 text-center"><p className="text-xl font-extrabold text-primary">{value}</p><p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p></div>;
}

function BreedBreakdownRow({ row, species, fallbackSplit }) {
  const ownSplit = row.maleCount != null || row.femaleCount != null;
  const split = ownSplit ? { male: Number(row.maleCount || 0), female: Number(row.femaleCount || 0) } : fallbackSplit;
  const total = rowTotal(row);

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0"><p className="break-words text-base font-bold">{row.breed || "Unspecified"}</p>{species && <p className="text-sm text-muted-foreground">{species}</p>}</div>
        <span className="shrink-0 rounded-full bg-secondary/70 px-3 py-1 text-sm font-extrabold text-primary">{total} total</span>
      </div>
      {split ? (
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <p className="flex justify-between rounded-xl bg-muted/55 px-3 py-2"><span className="text-muted-foreground">Male</span> <strong className="text-foreground">{split.male}</strong></p>
          <p className="flex justify-between rounded-xl bg-muted/55 px-3 py-2"><span className="text-muted-foreground">Female</span> <strong className="text-foreground">{split.female}</strong></p>
        </div>
      ) : null}
    </div>
  );
}

function DetailSkeleton() {
  return <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="aspect-[4/3] rounded-[1.5rem]" /><div className="space-y-4"><Skeleton className="h-44 rounded-[1.5rem]" /><Skeleton className="h-24 rounded-[1.5rem]" /><Skeleton className="h-52 rounded-[1.5rem]" /></div></div>;
}
