import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { qurbi } from "@/api/qurbiClient";
import { Boxes, ChevronRight, Plus, RefreshCw } from "lucide-react";
import LivestockCard from "@/components/agri/LivestockCard";
import EmptyState from "@/components/agri/EmptyState";
import CowSilhouetteIcon from "@/components/agri/CowSilhouetteIcon";
import ConfirmDialog from "@/components/agri/ConfirmDialog";
import { useToast } from "@/components/ui/use-toast";
import { LIVESTOCK_STATUS_META, listingExpiry, livestockTitle } from "@/lib/agri";
import { cn } from "@/lib/utils";
import { refreshExpiredReservations } from "@/lib/livestockReservation";

// Keys stay the raw statuses (plus "Expired") so links like ?filter=Available keep working.
const FILTERS = [
  { key: "All", label: "All", match: () => true },
  { key: "Available", label: LIVESTOCK_STATUS_META.Available.label, match: (item) => item.status === "Available" && !listingExpiry(item).expired },
  { key: "Expired", label: LIVESTOCK_STATUS_META.Expired.label, match: (item) => item.status === "Available" && listingExpiry(item).expired },
  { key: "Draft", label: LIVESTOCK_STATUS_META.Draft.label, match: (item) => item.status === "Draft" },
  { key: "Reserved", label: LIVESTOCK_STATUS_META.Reserved.label, match: (item) => item.status === "Reserved" },
  { key: "Sold", label: LIVESTOCK_STATUS_META.Sold.label, match: (item) => item.status === "Sold" },
  { key: "Unavailable", label: LIVESTOCK_STATUS_META.Unavailable.label, match: (item) => item.status === "Unavailable" },
];

const EMPTY_COPY = {
  All: ["No animals yet", "Add your first animal to start selling on QURBI."],
  Available: ["Nothing for sale", "Add an animal, or edit a draft and choose “For sale”."],
  Expired: ["No expired listings", "Good — all your listings are still visible to buyers."],
  Draft: ["No drafts", "Drafts are listings you saved but haven't published yet."],
  Reserved: ["Nothing reserved", "Animals a buyer is paying for will show here."],
  Sold: ["Nothing sold yet", "Sold animals will show here after delivery."],
  Unavailable: ["No hidden listings", "Listings you hide from buyers will show here."],
};

export default function MyLivestock() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const requested = searchParams.get("filter");
  const filter = FILTERS.some((item) => item.key === requested) ? requested : "All";
  const setFilter = (key) => setSearchParams(key === "All" ? {} : { filter: key }, { replace: true });

  const load = () => {
    setLoading(true);
    setLoadError("");
    qurbi.entities.Livestock.list("-created_date", 100)
      .then((d) => refreshExpiredReservations(d || []))
      .then((d) => setItems(d || []))
      .catch((error) => setLoadError(error?.message || "Your listings could not be loaded."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const active = FILTERS.find((item) => item.key === filter) || FILTERS[0];
  const filtered = items.filter(active.match);
  const [emptyTitle, emptyText] = EMPTY_COPY[filter] || EMPTY_COPY.All;

  const doDelete = async () => {
    setDeleting(true);
    try {
      await qurbi.entities.Livestock.delete(toDelete.id);
      setItems((prev) => prev.filter((i) => i.id !== toDelete.id));
      toast({ title: "Listing deleted", description: `${livestockTitle(toDelete)} was removed.` });
      setToDelete(null);
    } catch (err) {
      toast({ title: "Couldn't delete the listing", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight lg:text-3xl">My Livestock</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your animal listings and what each one needs.</p>
        </div>
        <button type="button" onClick={() => navigate("/livestock/add")} className="brand-gradient flex h-12 shrink-0 items-center gap-1.5 rounded-2xl px-4 text-sm font-bold text-primary-foreground shadow-[0_4px_12px_rgba(65,54,45,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Plus className="h-5 w-5" /> Add
        </button>
      </div>

      <button type="button" onClick={() => navigate("/bulk")} className="soft-card mt-5 flex min-h-[72px] w-full items-center justify-between gap-3 p-4 text-left transition-all hover:border-primary/20">
        <span className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/70 text-primary"><Boxes className="h-5 w-5" /></span><span className="min-w-0"><strong className="block text-base">Bulk sell</strong><span className="block text-sm text-muted-foreground">Sell a group of animals in one listing</span></span></span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </button>

      {/* Status tabs */}
      <div className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:px-0" role="tablist" aria-label="Filter by status">
        {FILTERS.map((item) => {
          const count = items.filter(item.match).length;
          const selected = filter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setFilter(item.key)}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors",
                selected ? "brand-gradient text-primary-foreground shadow-sm" : "bg-card text-muted-foreground ring-1 ring-border/70 hover:text-foreground"
              )}
            >
              {item.label}
              {!loading && <span className={cn("flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs", selected ? "bg-white/20" : item.key === "Expired" && count ? "bg-red-100 text-red-700" : "bg-muted")}>{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {loadError && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
            <span>{loadError}</span>
            <button type="button" onClick={load} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-card px-3 font-bold"><RefreshCw className="h-4 w-4" />Retry</button>
          </div>
        )}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-[1.25rem] bg-muted" />)}
          </div>
        ) : filtered.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((l) => (
              <LivestockCard
                key={l.id}
                livestock={l}
                statusPlacement="content"
                onEdit={(li) => navigate(`/livestock/${li.id}/edit`)}
                onDelete={(li) => setToDelete(li)}
              />
            ))}
          </div>
        ) : !loadError ? (
          <EmptyState
            icon={CowSilhouetteIcon}
            title={emptyTitle}
            description={emptyText}
            action={filter === "All" || filter === "Available"
              ? <button type="button" onClick={() => navigate("/livestock/add")} className="brand-gradient min-h-11 rounded-2xl px-5 text-sm font-bold text-primary-foreground">Add animal</button>
              : <button type="button" onClick={() => setFilter("All")} className="min-h-11 rounded-2xl bg-card px-5 text-sm font-bold text-primary ring-1 ring-border">Show all listings</button>}
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this listing?"
        description={toDelete ? `${livestockTitle(toDelete)} will be removed for good. This can't be undone.` : "This action cannot be undone."}
        confirmText="Delete"
        destructive
        loading={deleting}
        onConfirm={doDelete}
      />
    </div>
  );
}
