import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { qurbi } from "@/api/qurbiClient";
import { Image } from "@/components/ui/image";
import { Loader2, PackageOpen, Pencil, Plus, Trash2, Users } from "lucide-react";
import ConfirmDialog from "@/components/agri/ConfirmDialog";
import EmptyState from "@/components/agri/EmptyState";
import StatusBadge from "@/components/agri/StatusBadge";
import { useToast } from "@/components/ui/use-toast";
import { formatMYR } from "@/lib/agri";

export default function BulkListings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    qurbi.entities.BulkListing.list("-created_date", 100)
      .then((rows) => setItems(rows || []))
      .finally(() => setLoading(false));
  }, []);

  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await qurbi.entities.BulkListing.delete(toDelete.id);
      setItems((current) => current.filter((item) => item.id !== toDelete.id));
      toast({ title: "Bulk listing deleted" });
      setToDelete(null);
    } catch (error) {
      toast({ title: "Couldn't delete the bulk listing", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0"><h1 className="text-2xl font-extrabold tracking-tight lg:text-3xl">Bulk Sell</h1><p className="mt-1 text-sm text-muted-foreground">Sell a group of animals for one total price.</p></div>
        <button type="button" onClick={() => navigate("/bulk/add")} aria-label="Create bulk listing" className="brand-gradient flex h-12 shrink-0 items-center gap-1.5 rounded-2xl px-4 text-sm font-bold text-primary-foreground shadow-[0_4px_12px_rgba(65,54,45,0.18)]"><Plus className="h-5 w-5" /> Add</button>
      </div>

      <div className="mt-5">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div> : items.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const total = Number(item.maleCount || 0) + Number(item.femaleCount || 0);
              return (
                <article key={item.id} className="soft-card overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_10px_24px_rgba(65,54,45,0.11)]">
                  <button type="button" onClick={() => navigate(`/bulk/${item.id}`)} className="block w-full text-left">
                    <div className="aspect-[16/9] overflow-hidden bg-muted">
                      <Image
                        src={item.coverImage || item.images?.[0]}
                        fittingType="fill"
                        alt={item.name || "Bulk livestock listing"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <StatusBadge kind="bulk" status={item.status} dot />
                      <div className="mt-3 flex items-end justify-between gap-4"><div className="min-w-0"><h2 className="line-clamp-2 text-lg font-extrabold leading-snug text-primary">{item.name}</h2><p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"><Users className="h-4 w-4" />{total} animals{item.maleCount != null || item.femaleCount != null ? ` · ${Number(item.maleCount || 0)} male, ${Number(item.femaleCount || 0)} female` : ""}</p></div><p className="shrink-0 text-lg font-extrabold text-foreground">{formatMYR(item.totalPrice)}</p></div>
                    </div>
                  </button>
                  <div className="flex gap-2 border-t border-border/65 bg-muted/20 p-3">
                    <button type="button" onClick={() => navigate(`/bulk/${item.id}`)} className="brand-gradient min-h-11 flex-1 rounded-2xl px-4 text-sm font-bold text-white">View details</button>
                    <button type="button" onClick={() => navigate(`/bulk/${item.id}/edit`)} aria-label={`Edit ${item.name}`} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/65 text-primary"><Pencil className="h-[18px] w-[18px]" /></button>
                    <button type="button" onClick={() => setToDelete(item)} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card text-destructive ring-1 ring-destructive/25 transition-colors hover:bg-destructive/10" aria-label={`Delete ${item.name}`}><Trash2 className="h-[18px] w-[18px]" /></button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : <EmptyState icon={PackageOpen} title="No bulk listings yet" description="Selling a group — for example 5 cows for a mosque korban? Create one listing with a single total price." action={<button type="button" onClick={() => navigate("/bulk/add")} className="brand-gradient min-h-11 rounded-2xl px-5 text-sm font-bold text-primary-foreground">Create bulk listing</button>} />}
      </div>

      <ConfirmDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)} title="Delete this bulk listing?" description={toDelete ? `${toDelete.name} will be removed for good. This can't be undone.` : "This action cannot be undone."} confirmText="Delete" destructive loading={deleting} onConfirm={remove} />
    </div>
  );
}
