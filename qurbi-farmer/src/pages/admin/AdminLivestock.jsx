import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { qurbi } from "@/api/qurbiClient";
import EmptyState from "@/components/agri/EmptyState";
import CowSilhouetteIcon from "@/components/agri/CowSilhouetteIcon";
import ConfirmDialog from "@/components/agri/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, ChevronRight, Eye, EyeOff, Loader2, Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LIVESTOCK_STATUSES } from "@/lib/agri";
import { cn } from "@/lib/utils";
import { AdminPageHeader, FilterChips, ListSkeleton, ResultCount, SearchField } from "@/components/admin/AdminUi";
import AdminLivestockRow, { LivestockChips, LivestockThumb, livestockView } from "@/components/admin/AdminLivestockRow";
import { setListingFeatured, setListingHidden } from "@/components/admin/livestockActions";

export default function AdminLivestock() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [confirmHide, setConfirmHide] = useState(null);
  const [breedFilter, setBreedFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  const [search, setSearch] = useState("");
  const statusParam = searchParams.get("status") || "All";
  const statusFilter = ["All", "Hidden", ...LIVESTOCK_STATUSES].includes(statusParam) ? statusParam : "All";

  const load = () => {
    setLoading(true);
    setError("");
    qurbi.entities.Livestock.list("-created_date", 200)
      .then((d) => setItems(d || []))
      .catch((loadError) => setError(loadError.message || "Listings could not be loaded."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const setStatusFilter = (value) => setSearchParams(value === "All" ? {} : { status: value }, { replace: true });

  const breeds = [...new Set(items.map((item) => item.breed).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) =>
      (statusFilter === "All" || (statusFilter === "Hidden" ? item.disabled : item.status === statusFilter)) &&
      (breedFilter === "All" || item.breed === breedFilter) &&
      (genderFilter === "All" || item.gender === genderFilter) &&
      (!term || `${item.title || ""} ${item.species || ""} ${item.breed || ""} ${item.tagNumber || ""}`.toLowerCase().includes(term))
    );
  }, [items, statusFilter, breedFilter, genderFilter, search]);

  const statusOptions = [
    { value: "All", label: "All", count: items.length },
    ...LIVESTOCK_STATUSES.map((status) => ({ value: status, label: status, count: items.filter((item) => item.status === status).length }))
      .filter((option) => option.count > 0 || option.value === statusFilter),
    { value: "Hidden", label: "Hidden", count: items.filter((item) => item.disabled).length, attention: true },
  ].filter((option) => option.value !== "Hidden" || option.count > 0 || statusFilter === "Hidden");

  const applyUpdate = (id, update) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...update } : i)));

  const toggleHidden = async (item) => {
    setBusy(`hide-${item.id}`);
    try {
      const update = await setListingHidden(item, !item.disabled);
      applyUpdate(item.id, update);
      toast({ title: update.disabled ? "Listing hidden" : "Listing visible again", description: update.disabled ? "Buyers can no longer see this listing." : "The listing is back on the marketplace (if it is otherwise eligible)." });
      setConfirmHide(null);
    } catch (err) {
      toast({ variant: "destructive", title: "Could not update visibility", description: err.message || "Failed to update" });
    } finally {
      setBusy(null);
    }
  };

  const toggleFeatured = async (item) => {
    setBusy(`feature-${item.id}`);
    try {
      const update = await setListingFeatured(item, !item.featured);
      applyUpdate(item.id, update);
      toast({ title: update.featured ? "Listing featured" : "Removed from featured", description: update.featured ? "It will be highlighted on the buyer home page." : "It is no longer highlighted." });
    } catch (err) {
      toast({ variant: "destructive", title: "Could not update featured", description: err.message || "Failed to update" });
    } finally {
      setBusy(null);
    }
  };

  const requestVisibility = (item) => (item.disabled ? toggleHidden(item) : setConfirmHide(item));

  const resetFilters = () => {
    setStatusFilter("All");
    setBreedFilter("All");
    setGenderFilter("All");
    setSearch("");
  };

  const actionButtons = (item, compact = false) => (
    <>
      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        onClick={() => toggleFeatured(item)}
        disabled={busy === `feature-${item.id}`}
        aria-pressed={Boolean(item.featured)}
        className={cn(compact ? "h-10" : "flex-1", item.featured && "border-primary/40 bg-secondary/50")}
      >
        {busy === `feature-${item.id}` ? <Loader2 className="animate-spin" /> : <Star className={cn(item.featured && "fill-current")} />}
        {item.featured ? "Featured" : "Feature"}
      </Button>
      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        onClick={() => requestVisibility(item)}
        disabled={busy === `hide-${item.id}`}
        className={cn(compact ? "h-10" : "flex-1", item.disabled ? "text-emerald-800" : "text-destructive hover:text-destructive")}
      >
        {busy === `hide-${item.id}` ? <Loader2 className="animate-spin" /> : item.disabled ? <Eye /> : <EyeOff />}
        {item.disabled ? "Show" : "Hide"}
      </Button>
    </>
  );

  return (
    <div className="animate-fade-in">
      <AdminPageHeader eyebrow="Marketplace management" title="Livestock" description="Every farmer listing. Feature the best ones or hide listings from buyers." />

      <div className="mt-5 space-y-3">
        <FilterChips label="Filter by listing status" options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
        <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
          <SearchField id="livestock-search" label="Search listings" value={search} onChange={setSearch} placeholder="Search title, breed or tag" disabled={loading} />
          <div className="grid grid-cols-2 gap-2.5 sm:contents">
            <Select value={breedFilter} onValueChange={setBreedFilter}><SelectTrigger aria-label="Filter by breed" className="h-12 rounded-2xl bg-card"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All breeds</SelectItem>{breeds.map((breed) => <SelectItem key={breed} value={breed}>{breed}</SelectItem>)}</SelectContent></Select>
            <Select value={genderFilter} onValueChange={setGenderFilter}><SelectTrigger aria-label="Filter by gender" className="h-12 rounded-2xl bg-card"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All genders</SelectItem><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex flex-wrap items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-destructive">Listings could not be loaded</p><p className="mt-0.5 text-sm text-muted-foreground">{error}</p></div>
          <Button variant="outline" onClick={load}>Try again</Button>
        </div>
      )}

      <div className="mt-5">
        {!loading && !error && <div className="mb-3"><ResultCount shown={filtered.length} total={items.length} noun="listing" /></div>}
        {loading ? <ListSkeleton rows={5} /> : error ? null : filtered.length ? (
          <>
            {/* Phone / tablet: compact rows */}
            <div className="grid gap-3 md:grid-cols-2 lg:hidden">
              {filtered.map((item) => (
                <AdminLivestockRow key={item.id} item={item} onOpen={() => navigate(`/admin/livestock/${item.id}`)} footer={actionButtons(item)} />
              ))}
            </div>

            {/* Desktop: table */}
            <div className="soft-card hidden overflow-hidden lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3">Listing</th>
                    <th scope="col" className="w-40 px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3 text-right">Price</th>
                    <th scope="col" className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filtered.map((item) => {
                    const view = livestockView(item);
                    return (
                      <tr key={item.id} className={cn("transition-colors hover:bg-muted/30", view.hidden && "bg-muted/25")}>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => navigate(`/admin/livestock/${item.id}`)} className="flex min-w-0 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <LivestockThumb src={view.cover} className={cn("h-12 w-12", view.hidden && "opacity-60")} />
                            <span className="min-w-0">
                              <span className="block max-w-[18rem] truncate font-extrabold text-foreground hover:underline">{view.title}</span>
                              <span className="block max-w-[22rem] truncate text-xs text-muted-foreground">{[view.species, view.breed, view.gender, view.age, view.tag].filter(Boolean).join(" · ")}</span>
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3"><LivestockChips view={view} /></td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-extrabold tabular-nums">{view.price}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {actionButtons(item, true)}
                            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigate(`/admin/livestock/${item.id}`)} aria-label={`View ${view.title}`} title="View details"><ChevronRight /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState
            icon={CowSilhouetteIcon}
            title={items.length ? "No listings match" : "No livestock yet"}
            description={items.length ? "No listings match the selected status, breed, gender or search." : "Farmer listings will appear here once they are created."}
            action={items.length ? <Button onClick={resetFilters}>Clear filters</Button> : null}
          />
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmHide)}
        onOpenChange={(open) => { if (!open && !busy) setConfirmHide(null); }}
        title="Hide this listing?"
        description={confirmHide ? `"${livestockView(confirmHide).title}" will be removed from the marketplace immediately. Buyers will not see it until you show it again.` : ""}
        confirmText="Hide listing"
        destructive
        loading={Boolean(confirmHide && busy === `hide-${confirmHide.id}`)}
        onConfirm={() => confirmHide && toggleHidden(confirmHide)}
      />
    </div>
  );
}
