import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle, ArrowLeft, Building2, CalendarDays, CheckCircle2, ChevronRight, Eye, EyeOff, Hash, Loader2, Mail, MapPin,
  Palette, Ruler, Star, Tag, UserRound, Utensils, Weight,
} from "lucide-react";
import { qurbi } from "@/api/qurbiClient";
import { resolveApiAssetUrl } from "@/api/apiClient";
import SectionHeader from "@/components/agri/SectionHeader";
import StatusBadge from "@/components/agri/StatusBadge";
import ConfirmDialog from "@/components/agri/ConfirmDialog";
import { Image } from "@/components/ui/image";
import { useToast } from "@/components/ui/use-toast";
import { formatAge, malaysiaState } from "@/lib/agri";
import { cn } from "@/lib/utils";
import { formatPrice, genderLabel, listingTitle, livestockStatusInfo } from "@/components/admin/adminFormat";
import { setListingFeatured, setListingHidden } from "@/components/admin/livestockActions";

export default function AdminLivestockDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [owner, setOwner] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [updatingFeatured, setUpdatingFeatured] = useState(false);
  const [confirmHide, setConfirmHide] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    qurbi.entities.Livestock.get(id)
      .then(async (livestock) => {
        const [user, profiles] = await Promise.all([
          qurbi.entities.User.get(livestock.ownerId).catch(() => null),
          qurbi.entities.FarmerProfile.filter({ userId: livestock.ownerId }, "-created_date", 1).catch(() => []),
        ]);
        const farmerProfile = profiles?.[0] || null;
        const correctState = malaysiaState(livestock.state, livestock.farmLocation, farmerProfile?.state);
        let normalizedLivestock = livestock;
        if (correctState && livestock.state !== correctState) {
          await qurbi.entities.Livestock.update(livestock.id, { state: correctState }).catch(() => null);
          normalizedLivestock = { ...livestock, state: correctState };
        }
        setItem(normalizedLivestock);
        setOwner(user);
        setProfile(farmerProfile);
      })
      .catch(() => navigate("/admin/livestock", { replace: true }))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const toggleVisibility = async () => {
    setUpdatingVisibility(true);
    try {
      const update = await setListingHidden(item, !item.disabled, profile?.state);
      setItem((current) => ({ ...current, ...update }));
      setConfirmHide(false);
      toast({ title: update.disabled ? "Listing hidden" : "Listing visible again", description: update.disabled ? "Buyers can no longer see this listing." : "The listing is back on the marketplace (if it is otherwise eligible)." });
    } catch (error) {
      toast({ variant: "destructive", title: "Could not update visibility", description: error.message || "Failed to update listing visibility" });
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const toggleFeatured = async () => {
    setUpdatingFeatured(true);
    try {
      const update = await setListingFeatured(item, !item.featured);
      setItem((current) => ({ ...current, ...update }));
      toast({ title: update.featured ? "Listing featured" : "Removed from featured", description: update.featured ? "It will be highlighted on the buyer home page." : "It is no longer highlighted." });
    } catch (error) {
      toast({ variant: "destructive", title: "Could not update featured", description: error.message || "Failed to update" });
    } finally {
      setUpdatingFeatured(false);
    }
  };

  if (loading) return <DetailSkeleton />;
  if (!item) return null;

  const images = item.images?.length ? item.images : (item.coverImage ? [item.coverImage] : []);
  const videos = item.videos?.length ? item.videos : [];
  const ownerName = owner?.data?.name || owner?.name || owner?.full_name || owner?.email?.split("@")[0] || "Unknown farmer";
  const location = malaysiaState(item.state, item.farmLocation, profile?.state);
  const farmAddress = profile?.address || item.farmAddress || "";
  const status = livestockStatusInfo(item.status);
  const title = listingTitle(item);
  const onMarketplace = !item.disabled && item.marketplaceVisible !== false;

  return (
    <div className="animate-fade-in">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Go back" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-card text-primary shadow-[0_2px_8px_rgba(65,54,45,0.07)] ring-1 ring-border/70"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary/80">Livestock details</p>
          <h1 className="truncate text-xl font-extrabold tracking-tight lg:text-2xl">{title}</h1>
        </div>
      </header>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,.92fr)] lg:gap-8">
        <div className="min-w-0 space-y-5 lg:sticky lg:top-8">
          <section aria-label="Livestock gallery" className="soft-card overflow-hidden p-2">
            <div className="aspect-[4/3] overflow-hidden rounded-[1rem] bg-muted sm:aspect-[16/11]">
              {images.length ? <Image src={images[activeImage]} fittingType="fill" alt={`${item.species || "Livestock"} photo ${activeImage + 1}`} className="h-full w-full" /> : <div className="flex h-full w-full items-center justify-center text-sm font-medium text-muted-foreground">No image available</div>}
            </div>
            {images.length > 1 && (
              <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto p-1">
                {images.map((url, index) => (
                  <button key={`${url}-${index}`} type="button" onClick={() => setActiveImage(index)} aria-label={`Show image ${index + 1}`} className={cn("h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-card transition-all", index === activeImage ? "ring-primary" : "ring-transparent opacity-70 hover:opacity-100")}>
                    <Image src={url} fittingType="fill" alt="" className="h-full w-full" />
                  </button>
                ))}
              </div>
            )}
          </section>

          {videos.length > 0 && (
            <section>
              <SectionHeader title="Videos" />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">{videos.map((url, index) => <video key={`${url}-${index}`} src={resolveApiAssetUrl(url)} controls preload="metadata" className="aspect-video w-full rounded-[1.25rem] bg-black shadow-sm" />)}</div>
            </section>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <section className="soft-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone={status.tone} dot>{status.label}</StatusBadge>
                  {item.disabled && <StatusBadge tone="danger"><EyeOff className="h-3.5 w-3.5" />Hidden by admin</StatusBadge>}
                  {item.featured && <StatusBadge tone="primary"><Star className="h-3.5 w-3.5" />Featured</StatusBadge>}
                </div>
                <h2 className="mt-3 break-words text-2xl font-extrabold leading-tight tracking-tight text-primary">{item.species || "Livestock"}</h2>
                <p className="mt-1 truncate text-base font-semibold text-muted-foreground">{item.breed || "Unspecified breed"}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Price</p>
                <p className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{formatPrice(item.price)}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <SummaryItem icon={CalendarDays} label="Age" value={formatAge(item)} />
              <SummaryItem icon={UserRound} label="Gender" value={genderLabel(item.gender)} />
              {item.color && <SummaryItem icon={Palette} label="Color" value={item.color} />}
              {location && <SummaryItem icon={MapPin} label="State" value={location} />}
            </div>
          </section>

          <section className="soft-card p-4 sm:p-5" aria-labelledby="admin-actions-heading">
            <h2 id="admin-actions-heading" className="text-base font-extrabold">Marketplace controls</h2>
            <div className={cn("mt-3 flex items-start gap-2.5 rounded-2xl p-3 text-sm", onMarketplace ? "bg-emerald-50 text-emerald-900" : "bg-muted/60 text-foreground")}>
              {onMarketplace ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
              <p className="min-w-0">
                <span className="font-bold">{item.disabled ? "Hidden by admin." : onMarketplace ? "Visible to buyers." : "Not visible to buyers."}</span>{" "}
                <span className="text-muted-foreground">{item.disabled ? "Show it again when the listing is ready." : !onMarketplace && item.marketplaceVisibilityReason ? `${item.marketplaceVisibilityReason}.` : onMarketplace ? "Hide it to remove it from the marketplace immediately." : ""}</span>
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={toggleFeatured} disabled={updatingFeatured} aria-pressed={Boolean(item.featured)} className={cn("flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-bold transition-colors disabled:opacity-60", item.featured ? "bg-secondary text-primary ring-1 ring-primary/30" : "brand-gradient text-white shadow-[0_4px_12px_rgba(65,54,45,0.14)]")}>
                {updatingFeatured ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Star className={cn("h-[18px] w-[18px]", item.featured && "fill-current")} />}
                {item.featured ? "Unfeature" : "Feature"}
              </button>
              <button type="button" onClick={() => (item.disabled ? toggleVisibility() : setConfirmHide(true))} disabled={updatingVisibility} className={cn("flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-bold transition-colors disabled:opacity-60", item.disabled ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-destructive/10 text-destructive hover:bg-destructive/15")}>
                {updatingVisibility ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : item.disabled ? <Eye className="h-[18px] w-[18px]" /> : <EyeOff className="h-[18px] w-[18px]" />}
                {updatingVisibility ? "Updating..." : item.disabled ? "Show listing" : "Hide listing"}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Featured listings are highlighted on the buyer home page.</p>
          </section>

          <ApprovalMessages item={item} />

          <button type="button" onClick={() => navigate(`/admin/farmers/${item.ownerId}`)} className="soft-card group flex w-full items-center gap-3 p-4 text-left transition-all hover:border-primary/20 hover:shadow-sm">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/70 text-primary"><Building2 className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Seller account</span>
              <strong className="mt-0.5 block truncate text-sm">{ownerName}</strong>
              <span className="block truncate text-xs text-muted-foreground">{profile?.farmName || "Farm profile"}</span>
              {owner?.email && <span className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{owner.email}</span></span>}
            </span>
            <span className="flex items-center gap-0.5 text-sm font-bold text-primary">View<ChevronRight className="h-4 w-4" /></span>
          </button>

          {farmAddress && (
            <section className="soft-card flex items-start gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/70 text-primary"><MapPin className="h-5 w-5" /></span>
              <div><p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Farm address</p><p className="mt-1 text-sm font-semibold leading-5 text-foreground">{farmAddress}</p></div>
            </section>
          )}

          {item.description && (
            <section className="soft-card p-5">
              <h2 className="text-lg font-extrabold tracking-tight">About this animal</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.description}</p>
            </section>
          )}

          <SpecGrid item={item} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmHide}
        onOpenChange={(open) => { if (!open && !updatingVisibility) setConfirmHide(false); }}
        title="Hide this listing?"
        description={`"${title}" will be removed from the marketplace immediately. Buyers will not see it until you show it again.`}
        confirmText="Hide listing"
        destructive
        loading={updatingVisibility}
        onConfirm={toggleVisibility}
      />
    </div>
  );
}

function ApprovalMessages({ item }) {
  const messages = [];
  if (item.speciesApprovalStatus === "Pending") messages.push({ tone: "warning", text: "This species is waiting for approval. The listing remains hidden from buyers." });
  if (item.speciesApprovalStatus === "Rejected") messages.push({ tone: "danger", text: "The proposed species was rejected. The farmer must select an approved species." });
  if (item.breedApprovalStatus === "Pending") messages.push({ tone: "warning", text: "This breed is waiting for approval. The listing remains hidden from buyers." });
  if (item.breedApprovalStatus === "Rejected") messages.push({ tone: "danger", text: "The proposed breed was rejected and is treated as Unspecified until the farmer updates it." });
  if (!messages.length) return null;

  return <div className="space-y-2">{messages.map((message, index) => <div key={`${message.tone}-${index}`} className={cn("flex items-start gap-2.5 rounded-2xl p-3.5 text-xs leading-relaxed", message.tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-amber-100/75 text-amber-900")}><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{message.text}</span></div>)}</div>;
}

function SummaryItem({ icon: Icon, label, value }) {
  return <div className="rounded-2xl bg-muted/60 p-3"><p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground"><Icon className="h-3.5 w-3.5 text-primary/70" />{label}</p><p className="mt-1 truncate text-sm font-bold text-foreground">{value}</p></div>;
}

function SpecGrid({ item }) {
  const rows = [
    { icon: Weight, label: "Weight", value: item.weight, suffix: "kg" },
    { icon: Ruler, label: "Height", value: item.height, suffix: "cm" },
    { icon: Ruler, label: "Body Length", value: item.bodyLength, suffix: "cm" },
    { icon: Ruler, label: "Chest Girth", value: item.chestGirth, suffix: "cm" },
    { icon: Hash, label: "Tag Number", value: item.tagNumber || item.earTag },
    { icon: Tag, label: "RFID", value: item.rfid },
  ].filter((row) => row.value);

  if (!rows.length && !item.feedDetails && !item.specialNotes) return null;

  return (
    <section>
      <SectionHeader title="Animal information" />
      <div className="mt-3 space-y-3">
        {rows.length > 0 && <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{rows.map((row) => <div key={row.label} className="soft-card p-3.5"><p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground"><row.icon className="h-3.5 w-3.5 text-primary/70" />{row.label}</p><p className="mt-1 text-sm font-extrabold">{row.value}{row.suffix ? ` ${row.suffix}` : ""}</p></div>)}</div>}
        {item.feedDetails && <Note icon={Utensils} title="Feed / Food Given" text={item.feedDetails} />}
        {item.specialNotes && <Note icon={Tag} title="Special Notes" text={item.specialNotes} />}
      </div>
    </section>
  );
}

function Note({ icon: Icon, title, text }) {
  return <div className="soft-card p-4"><p className="flex items-center gap-2 text-sm font-bold"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/70 text-primary"><Icon className="h-4 w-4" /></span>{title}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{text}</p></div>;
}

function DetailSkeleton() {
  return <div className="animate-pulse"><div className="h-12 w-52 rounded-2xl bg-muted" /><div className="mt-5 grid gap-6 lg:grid-cols-2"><div className="aspect-[4/3] rounded-[1.25rem] bg-muted" /><div className="space-y-3"><div className="h-52 rounded-[1.25rem] bg-muted" /><div className="h-24 rounded-[1.25rem] bg-muted" /><div className="h-32 rounded-[1.25rem] bg-muted" /></div></div><span className="sr-only">Loading livestock details</span></div>;
}
