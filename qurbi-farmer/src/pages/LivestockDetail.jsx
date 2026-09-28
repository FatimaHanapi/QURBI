import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle, ArrowLeft, CalendarDays, Hash, Loader2, MapPin, Palette, Pencil, Ruler, Tag, Trash2, UserRound, Utensils, Weight,
} from "lucide-react";
import { qurbi } from "@/api/qurbiClient";
import { resolveApiAssetUrl } from "@/api/apiClient";
import ConfirmDialog from "@/components/agri/ConfirmDialog";
import SectionHeader from "@/components/agri/SectionHeader";
import StatusBadge from "@/components/agri/StatusBadge";
import { Image } from "@/components/ui/image";
import { formatAge, formatMYR, listingExpiry, listingExpiryLabel, malaysiaState } from "@/lib/agri";
import { cn } from "@/lib/utils";
import { hasActivePaymentReservation, reservationExpiryLabel } from "@/lib/livestockReservation";

const STATUS_TONE = { Available: "success", Reserved: "warning", Sold: "muted", Sick: "danger" };

export default function LivestockDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [farmAddress, setFarmAddress] = useState("");
  const [farmState, setFarmState] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () =>
    qurbi.functions.invoke("checkLivestockReservation", { livestockId: id })
      .catch(() => null)
      .then(() => qurbi.entities.Livestock.get(id))
      .then(async (data) => {
        setItem(data);
        setActiveImg(0);

        const profiles = data.ownerId
          ? await qurbi.entities.FarmerProfile.filter({ userId: data.ownerId }).catch(() => [])
          : [];
        const farmerProfile = profiles?.[0];
        const correctState = malaysiaState(data.state, data.farmLocation, farmerProfile?.state);
        setFarmAddress(farmerProfile?.address || "");
        setFarmState(correctState);
        if (correctState && data.state !== correctState) {
          await qurbi.entities.Livestock.update(data.id, { state: correctState }).catch(() => null);
          setItem((current) => ({ ...current, state: correctState }));
        }
      })
      .catch(() => navigate("/livestock", { replace: true }))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [id]);

  const doDelete = async () => {
    setDeleting(true);
    try {
      await qurbi.entities.Livestock.delete(id);
      navigate("/livestock", { replace: true });
    } catch (error) {
      alert(error.message || "Failed to delete");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) return <DetailSkeleton />;
  if (!item) return null;

  const images = item.images?.length ? item.images : (item.coverImage ? [item.coverImage] : []);
  const videos = item.videos?.length ? item.videos : [];
  const location = malaysiaState(item.state, item.farmLocation, farmState);
  const paymentReserved = hasActivePaymentReservation(item);
  const expiry = listingExpiry(item);
  const listingExpired = item.status === "Available" && expiry.expired;

  return (
    <div className="animate-fade-in">
      <header className="sticky top-0 z-20 -mx-5 flex items-center justify-between border-b border-border/50 bg-background/90 px-5 py-2 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} aria-label="Go back" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-card text-primary shadow-[0_2px_8px_rgba(65,54,45,0.07)] ring-1 ring-border/70"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Listing management</p>
            <h1 className="truncate text-xl font-extrabold tracking-tight">Livestock details</h1>
          </div>
        </div>
        {!paymentReserved && <button type="button" onClick={() => navigate(`/livestock/${id}/edit`)} className="flex min-h-11 items-center gap-2 rounded-2xl bg-secondary/70 px-3.5 text-sm font-bold text-primary hover:bg-secondary"><Pencil className="h-4 w-4" /><span className="hidden sm:inline">Edit</span></button>}
      </header>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,.92fr)] lg:gap-8">
        <div className="min-w-0 space-y-5">
          <section aria-label="Livestock gallery" className="soft-card overflow-hidden p-2">
            <div className="aspect-[4/3] overflow-hidden rounded-[1rem] bg-muted sm:aspect-[16/11]">
              {images.length ? <Image src={images[activeImg]} fittingType="fill" alt={`${item.species || "Livestock"} photo ${activeImg + 1}`} className="h-full w-full" /> : <div className="flex h-full w-full items-center justify-center text-sm font-medium text-muted-foreground">No image available</div>}
            </div>
            {images.length > 1 && (
              <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto p-1">
                {images.map((url, index) => (
                  <button key={`${url}-${index}`} type="button" onClick={() => setActiveImg(index)} aria-label={`Show image ${index + 1}`} className={cn("h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-card transition-all", index === activeImg ? "ring-primary" : "ring-transparent opacity-70 hover:opacity-100")}>
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
                <StatusBadge tone={STATUS_TONE[item.status] || "muted"} dot>{item.status || "Unknown"}</StatusBadge>
                <h2 className="mt-3 truncate text-3xl font-extrabold tracking-tight text-primary">{item.species || "Livestock"}</h2>
                <p className="mt-1 truncate text-base font-semibold text-muted-foreground">{item.breed || "Unspecified breed"}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Price</p>
                <p className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{formatMYR(item.price)}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <SummaryItem icon={CalendarDays} label="Age" value={formatAge(item)} />
              <SummaryItem icon={UserRound} label="Gender" value={item.gender || "Not specified"} />
              {item.color && <SummaryItem icon={Palette} label="Color" value={item.color} />}
              {location && <SummaryItem icon={MapPin} label="State" value={location} />}
            </div>
          </section>

          <ApprovalMessages item={item} />

          {!paymentReserved && listingExpired && <section className="rounded-2xl bg-destructive/10 p-4 text-destructive"><p className="text-sm font-extrabold">Listing expired</p><p className="mt-1 text-xs leading-5">This animal stopped appearing to buyers on {listingExpiryLabel(item)}. Review the price and details, confirm it is still available, then renew it for another 14 days.</p></section>}

          {!paymentReserved && item.status === "Available" && !expiry.expired && expiry.expiresAt && <section className="soft-card p-4"><p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Listing renewal</p><p className="mt-1 text-sm font-semibold">Visible to buyers until {listingExpiryLabel(item)} ({expiry.daysRemaining} day{expiry.daysRemaining === 1 ? "" : "s"} left).</p></section>}

          {paymentReserved && <section className="rounded-2xl bg-amber-100/75 p-4 text-amber-900"><p className="text-sm font-extrabold">Temporary payment reservation</p><p className="mt-1 text-xs leading-5">A buyer is completing payment. This listing cannot be edited, deleted, or sold again until {reservationExpiryLabel(item)}.</p></section>}

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

          {!paymentReserved && <section className="soft-card p-3">
            <p className="px-1 pb-3 text-xs font-semibold text-muted-foreground">Manage this livestock listing</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => navigate(`/livestock/${id}/edit`)} className="brand-gradient flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-white shadow-[0_4px_12px_rgba(65,54,45,0.15)]"><Pencil className="h-[18px] w-[18px]" />{listingExpired ? "Update & renew" : "Edit listing"}</button>
              <button type="button" onClick={() => setConfirmDelete(true)} aria-label="Delete listing" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"><Trash2 className="h-5 w-5" /></button>
            </div>
          </section>}
        </div>
      </div>

      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete this listing?" description="This action cannot be undone. The livestock listing will be permanently removed." confirmText="Delete" destructive loading={deleting} onConfirm={doDelete} />
    </div>
  );
}

function ApprovalMessages({ item }) {
  const messages = [];
  if (item.speciesApprovalStatus === "Pending") messages.push({ tone: "warning", text: "This species is waiting for superadmin approval. The listing is saved but remains hidden from buyers." });
  if (item.speciesApprovalStatus === "Rejected") messages.push({ tone: "danger", text: "The proposed species was rejected. Edit this listing and select another species." });
  if (item.breedApprovalStatus === "Pending") messages.push({ tone: "warning", text: "This breed is waiting for superadmin approval. The listing is saved but remains hidden from buyers." });
  if (item.breedApprovalStatus === "Rejected") messages.push({ tone: "danger", text: "The proposed breed was rejected and remains Unspecified until you select another breed." });
  if (!messages.length) return null;

  return <div className="space-y-2">{messages.map((message, index) => <div key={`${message.tone}-${index}`} className={cn("flex items-start gap-2.5 rounded-2xl p-3.5 text-xs leading-relaxed", message.tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-amber-100/75 text-amber-900")}><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{message.text}</span></div>)}</div>;
}

function SummaryItem({ icon: Icon, label, value }) {
  return <div className="rounded-2xl bg-muted/60 p-3"><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground"><Icon className="h-3.5 w-3.5 text-primary/70" />{label}</p><p className="mt-1 truncate text-sm font-bold text-foreground">{value}</p></div>;
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
        {rows.length > 0 && <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{rows.map((row) => <div key={row.label} className="soft-card p-3.5"><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground"><row.icon className="h-3.5 w-3.5 text-primary/70" />{row.label}</p><p className="mt-1 text-sm font-extrabold">{row.value}{row.suffix ? ` ${row.suffix}` : ""}</p></div>)}</div>}
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
  return <div className="animate-pulse"><div className="h-12 w-52 rounded-2xl bg-muted" /><div className="mt-5 grid gap-6 lg:grid-cols-2"><div className="aspect-[4/3] rounded-[1.25rem] bg-muted" /><div className="space-y-3"><div className="h-52 rounded-[1.25rem] bg-muted" /><div className="h-20 rounded-[1.25rem] bg-muted" /><div className="h-32 rounded-[1.25rem] bg-muted" /></div></div><span className="sr-only"><Loader2 />Loading livestock details</span></div>;
}
