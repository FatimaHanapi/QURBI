import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Pencil, Trash2, Users } from "lucide-react";
import { qurbi } from "@/api/qurbiClient";
import { resolveApiAssetUrl } from "@/api/apiClient";
import ConfirmDialog from "@/components/agri/ConfirmDialog";
import StatusBadge from "@/components/agri/StatusBadge";
import { Image } from "@/components/ui/image";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMYR } from "@/lib/agri";
import { cn } from "@/lib/utils";

const STATUS_TONE = { Available: "success", Paused: "warning", Sold: "muted" };

export default function BulkListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    qurbi.entities.BulkListing.get(id)
      .then(setItem)
      .catch(() => navigate("/bulk", { replace: true }))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const remove = async () => {
    setDeleting(true);
    try {
      await qurbi.entities.BulkListing.delete(id);
      navigate("/bulk", { replace: true });
    } catch (error) {
      alert(error.message || "Bulk listing could not be deleted.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) return <DetailSkeleton />;
  if (!item) return null;

  const images = item.images?.length ? item.images : (item.coverImage ? [item.coverImage] : []);
  const videos = item.videos || [];
  const total = Number(item.maleCount || 0) + Number(item.femaleCount || 0);

  return (
    <div className="mx-auto w-full max-w-6xl animate-fade-in">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={() => navigate("/bulk")} aria-label="Back to bulk listings" className="soft-card flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Bulk sell</p><h1 className="truncate text-xl font-extrabold tracking-tight">Listing details</h1></div>
        </div>
        <button type="button" onClick={() => navigate(`/bulk/${id}/edit`)} className="flex h-11 items-center gap-2 rounded-2xl bg-secondary/70 px-3.5 text-sm font-bold text-primary"><Pencil className="h-4 w-4" /><span className="hidden sm:inline">Edit</span></button>
      </header>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,.92fr)] lg:gap-8">
        <div className="space-y-5">
          <section className="soft-card overflow-hidden p-2">
            <div className="aspect-[4/3] overflow-hidden rounded-[1rem] bg-muted sm:aspect-[16/11]">
              {images.length ? <Image src={images[activeImage]} fittingType="fill" alt={`${item.name} photo ${activeImage + 1}`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image available</div>}
            </div>
            {images.length > 1 && <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto p-1">{images.map((url, index) => <button key={`${url}-${index}`} type="button" onClick={() => setActiveImage(index)} className={cn("h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-card", index === activeImage ? "ring-primary" : "ring-transparent opacity-70")}><Image src={url} fittingType="fill" alt="" className="h-full w-full object-cover" /></button>)}</div>}
          </section>

          {videos.length > 0 && <section><h2 className="text-lg font-extrabold">Videos</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{videos.map((url, index) => <video key={`${url}-${index}`} src={resolveApiAssetUrl(url)} controls preload="metadata" className="aspect-video w-full rounded-2xl bg-black" />)}</div></section>}
        </div>

        <div className="space-y-5">
          <section className="soft-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4"><div className="min-w-0"><StatusBadge tone={STATUS_TONE[item.status] || "muted"} dot>{item.status}</StatusBadge><h2 className="mt-3 truncate text-3xl font-extrabold tracking-tight text-primary">{item.name}</h2></div><div className="shrink-0 text-right"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Total price</p><p className="mt-1 text-xl font-extrabold">{formatMYR(item.totalPrice)}</p></div></div>
            <div className="mt-5 grid grid-cols-3 gap-2.5"><Count label="Animals" value={total} /><Count label="Male" value={item.maleCount || 0} /><Count label="Female" value={item.femaleCount || 0} /></div>
          </section>

          {item.state && <section className="soft-card flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/70 text-primary"><MapPin className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">State</p><p className="mt-1 text-sm font-bold">{item.state}</p></div></section>}

          <section className="soft-card p-5">
            <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><h2 className="text-lg font-extrabold">Breed breakdown</h2></div>
            <div className="mt-4 divide-y divide-border/60">{item.breedBreakdown?.map((row, index) => <BreedBreakdownRow key={`${row.species}-${row.breed}-${index}`} row={row} />)}</div>
          </section>

          <section className="soft-card p-3"><p className="px-1 pb-3 text-xs font-semibold text-muted-foreground">Manage this bulk listing</p><div className="flex gap-2"><button type="button" onClick={() => navigate(`/bulk/${id}/edit`)} className="brand-gradient flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white"><Pencil className="h-[18px] w-[18px]" />Edit listing</button><button type="button" onClick={() => setConfirmDelete(true)} aria-label="Delete bulk listing" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><Trash2 className="h-5 w-5" /></button></div></section>
        </div>
      </div>

      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete this bulk listing?" description="This action cannot be undone." confirmText="Delete" destructive loading={deleting} onConfirm={remove} />
    </div>
  );
}

function Count({ label, value }) {
  return <div className="rounded-2xl bg-muted/55 p-3 text-center"><p className="text-xl font-extrabold text-primary">{value}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p></div>;
}

function BreedBreakdownRow({ row }) {
  const hasGenderSplit = row.maleCount != null && row.femaleCount != null;
  const maleCount = Number(row.maleCount || 0);
  const femaleCount = Number(row.femaleCount || 0);
  const total = hasGenderSplit ? maleCount + femaleCount : Number(row.count || 0);

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0"><p className="truncate text-sm font-bold">{row.breed}</p><p className="text-xs text-muted-foreground">{row.species}</p></div>
        <span className="shrink-0 rounded-full bg-secondary/70 px-3 py-1 text-xs font-extrabold text-primary">{total} total</span>
      </div>
      {hasGenderSplit ? (
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <p className="rounded-xl bg-muted/55 px-3 py-2"><span className="text-muted-foreground">Male</span> <strong className="float-right text-foreground">{maleCount}</strong></p>
          <p className="rounded-xl bg-muted/55 px-3 py-2"><span className="text-muted-foreground">Female</span> <strong className="float-right text-foreground">{femaleCount}</strong></p>
        </div>
      ) : <p className="mt-2 text-xs text-muted-foreground">Gender split was not recorded for this older listing.</p>}
    </div>
  );
}

function DetailSkeleton() {
  return <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="aspect-[4/3] rounded-[1.5rem]" /><div className="space-y-4"><Skeleton className="h-44 rounded-[1.5rem]" /><Skeleton className="h-24 rounded-[1.5rem]" /><Skeleton className="h-52 rounded-[1.5rem]" /></div></div>;
}
