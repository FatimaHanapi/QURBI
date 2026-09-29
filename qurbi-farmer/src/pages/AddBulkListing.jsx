import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { qurbi } from "@/api/qurbiClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Plus, Trash2, Users } from "lucide-react";
import ImageUploader from "@/components/agri/ImageUploader";
import VideoUploader from "@/components/agri/VideoUploader";
import StickyActionBar from "@/components/agri/StickyActionBar";
import { MALAYSIA_STATES, breedsFor, speciesOptions } from "@/lib/agri";

const newBreakdown = () => ({ species: "", breed: "", maleCount: "", femaleCount: "" });

const normalizeBreakdown = (listing) => {
  const rows = listing?.breedBreakdown?.length ? listing.breedBreakdown : [newBreakdown()];
  const singleLegacyBreed = rows.length === 1 && rows[0].maleCount == null && rows[0].femaleCount == null;

  return rows.map((row) => ({
    ...row,
    maleCount: row.maleCount ?? (singleLegacyBreed ? listing.maleCount ?? "" : ""),
    femaleCount: row.femaleCount ?? (singleLegacyBreed ? listing.femaleCount ?? "" : ""),
  }));
};

export default function AddBulkListing() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "", images: [], videos: [], coverImage: "",
    breedBreakdown: [newBreakdown()], state: "", totalPrice: "", status: "Available",
  });
  const [managedBreeds, setManagedBreeds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      qurbi.entities.FarmerProfile.filter({ userId: user.id }, "-created_date", 1),
      qurbi.entities.Breed.list("name", 500),
      editing ? qurbi.entities.BulkListing.get(id) : Promise.resolve(null),
    ]).then(([profiles, breeds, listing]) => {
      setForm((current) => listing ? {
        name: listing.name || "",
        images: listing.images || [],
        videos: listing.videos || [],
        coverImage: listing.coverImage || listing.images?.[0] || "",
        breedBreakdown: normalizeBreakdown(listing),
        state: listing.state || profiles?.[0]?.state || "",
        totalPrice: listing.totalPrice ?? "",
        status: listing.status || "Available",
      } : ({ ...current, state: current.state || profiles?.[0]?.state || "" }));
      setManagedBreeds(breeds || []);
    }).catch((loadError) => {
      if (editing) {
        alert(loadError.message || "Bulk listing could not be loaded.");
        navigate("/bulk", { replace: true });
      }
    }).finally(() => setLoading(false));
  }, [editing, id, navigate, user?.id]);

  const maleTotal = useMemo(() => form.breedBreakdown.reduce((sum, row) => sum + Number(row.maleCount || 0), 0), [form.breedBreakdown]);
  const femaleTotal = useMemo(() => form.breedBreakdown.reduce((sum, row) => sum + Number(row.femaleCount || 0), 0), [form.breedBreakdown]);
  const animalTotal = maleTotal + femaleTotal;
  const breakdownValid = form.breedBreakdown.length > 0 && form.breedBreakdown.every((row) => {
    const male = Number(row.maleCount || 0);
    const female = Number(row.femaleCount || 0);
    return row.species && row.breed && Number.isInteger(male) && Number.isInteger(female) && male >= 0 && female >= 0 && male + female > 0;
  });
  const breedKeys = form.breedBreakdown.filter((row) => row.species && row.breed).map((row) => `${row.species}:${row.breed}`);
  const hasDuplicateBreed = new Set(breedKeys).size !== breedKeys.length;
  const valid = Boolean(form.name.trim() && form.images.length && form.state && Number(form.totalPrice) > 0 && breakdownValid && !hasDuplicateBreed);
  const missing = [
    !form.images.length && "a photo",
    !form.name.trim() && "listing name",
    !breakdownValid && "species, breed and count for each group",
    hasDuplicateBreed && "remove the duplicate breed group",
    !form.state && "state",
    !(Number(form.totalPrice) > 0) && "total price",
  ].filter(Boolean);

  const updateBreakdown = (index, changes) => setForm((current) => ({
    ...current,
    breedBreakdown: current.breedBreakdown.map((row, rowIndex) => rowIndex === index ? { ...row, ...changes } : row),
  }));

  const submit = async () => {
    if (submitting) return;
    if (!valid) { setAttempted(true); return; }
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        images: form.images,
        videos: form.videos,
        coverImage: form.coverImage || form.images[0],
        maleCount: maleTotal,
        femaleCount: femaleTotal,
        breedBreakdown: form.breedBreakdown.map((row) => {
          const maleCount = Number(row.maleCount || 0);
          const femaleCount = Number(row.femaleCount || 0);
          return { ...row, maleCount, femaleCount, count: maleCount + femaleCount };
        }),
        state: form.state,
        totalPrice: Number(form.totalPrice),
        status: form.status,
        marketplaceVisible: form.status === "Available",
      };
      if (editing) await qurbi.entities.BulkListing.update(id, payload);
      else await qurbi.entities.BulkListing.create({ ...payload, ownerId: user.id });
      navigate(editing ? `/bulk/${id}` : "/bulk", { replace: true });
    } catch (submissionError) {
      setError(submissionError.message || "Bulk listing could not be saved.");
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;

  return (
    <div className="mx-auto w-full max-w-4xl animate-fade-in pb-8">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => navigate(editing ? `/bulk/${id}` : "/bulk")} aria-label="Back" className="soft-card flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0"><h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{editing ? "Edit Bulk Listing" : "Add Bulk Listing"}</h1><p className="mt-1 text-sm text-muted-foreground">{editing ? "Update this grouped livestock listing." : "Sell a group of animals at one total price."}</p></div>
      </div>

      <Section title="Photos & videos">
        <p className="text-sm font-semibold">Photos <span className="text-destructive" aria-hidden="true">*</span></p>
        <ImageUploader value={form.images} cover={form.coverImage} onChange={(images, coverImage) => setForm((current) => ({ ...current, images, coverImage }))} />
        {attempted && !form.images.length && <p role="alert" className="text-sm font-medium text-destructive">Add at least one photo of the group.</p>}
        <p className="pt-1 text-sm font-semibold">Videos <span className="font-normal text-muted-foreground">(optional)</span></p>
        <VideoUploader value={form.videos} onChange={(videos) => setForm((current) => ({ ...current, videos }))} buttonLabel="Add bulk listing video" />
      </Section>

      <Section title="Bulk details">
        <Field label="Listing name" required error={attempted && !form.name.trim() ? "Give this listing a name buyers will recognise." : ""}><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Korban package — 5 KK cows" className="h-12 text-base" /></Field>
        <p className="text-sm text-muted-foreground">Enter the male and female count for each breed below. The totals update automatically.</p>
        <div className="grid grid-cols-3 gap-2.5">
          <CountSummary label="Animals" value={animalTotal} />
          <CountSummary label="Male" value={maleTotal} />
          <CountSummary label="Female" value={femaleTotal} />
        </div>
      </Section>

      <Section title="Count by breed">
        {form.breedBreakdown.map((row, index) => (
          <div key={index} className="rounded-2xl border border-border p-3 space-y-3">
            <div className="flex min-h-11 items-center justify-between"><p className="text-sm font-bold">Breed group {index + 1}</p>{form.breedBreakdown.length > 1 && <button type="button" aria-label={`Remove breed group ${index + 1}`} onClick={() => setForm((current) => ({ ...current, breedBreakdown: current.breedBreakdown.filter((_, rowIndex) => rowIndex !== index) }))} className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" />Remove</button>}</div>
            <Select value={row.species} onValueChange={(species) => updateBreakdown(index, { species, breed: "" })}>
              <SelectTrigger className="h-12" aria-label={`Species for breed group ${index + 1}`}><SelectValue placeholder="Select species" /></SelectTrigger>
              <SelectContent>{speciesOptions().map((species) => <SelectItem key={species} value={species}>{species}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={row.breed} onValueChange={(breed) => updateBreakdown(index, { breed })} disabled={!row.species}>
              <SelectTrigger className="h-12" aria-label={`Breed for breed group ${index + 1}`}><SelectValue placeholder={row.species ? "Select breed" : "Choose species first"} /></SelectTrigger>
              <SelectContent>{breedsFor(row.species, managedBreeds).map((breed) => <SelectItem key={breed} value={breed}>{breed}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Male"><Input type="number" inputMode="numeric" min="0" step="1" value={row.maleCount} onChange={(event) => updateBreakdown(index, { maleCount: event.target.value })} placeholder="0" className="h-12" /></Field>
              <Field label="Female"><Input type="number" inputMode="numeric" min="0" step="1" value={row.femaleCount} onChange={(event) => updateBreakdown(index, { femaleCount: event.target.value })} placeholder="0" className="h-12" /></Field>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm font-semibold text-muted-foreground"><Users className="h-4 w-4 text-primary" />This breed: <strong className="text-foreground">{Number(row.maleCount || 0) + Number(row.femaleCount || 0)} animals</strong></div>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => setForm((current) => ({ ...current, breedBreakdown: [...current.breedBreakdown, newBreakdown()] }))} className="h-12 w-full rounded-xl"><Plus className="w-4 h-4 mr-2" /> Add another breed</Button>
        <p className={`text-sm ${breakdownValid && !hasDuplicateBreed ? "text-primary" : attempted ? "text-destructive" : "text-muted-foreground"}`}>Recorded total: {animalTotal} animals ({maleTotal} male, {femaleTotal} female).</p>
        {hasDuplicateBreed && <p role="alert" className="text-sm text-destructive">Each species and breed combination should appear only once. Update the existing group instead of adding a duplicate.</p>}
      </Section>

      <Section title="Location & price">
        <Field label="State" required error={attempted && !form.state ? "Choose the state." : ""}><Select value={form.state} onValueChange={(state) => setForm((current) => ({ ...current, state }))}><SelectTrigger className="h-12"><SelectValue placeholder="Select state" /></SelectTrigger><SelectContent>{MALAYSIA_STATES.map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Total price for the whole group (RM)" required error={attempted && !(Number(form.totalPrice) > 0) ? "Enter a total price above RM 0." : ""}><Input type="number" inputMode="decimal" min="0" step="0.01" value={form.totalPrice} onChange={(event) => setForm((current) => ({ ...current, totalPrice: event.target.value }))} placeholder="e.g. 26500" className="h-12 text-base" /></Field>
        <Field label="Who can see this listing?" required><Select value={form.status} onValueChange={(status) => setForm((current) => ({ ...current, status }))}><SelectTrigger className="h-12"><SelectValue /></SelectTrigger><SelectContent>{["Available", "Draft"].map((status) => <SelectItem key={status} value={status}>{status === "Available" ? "For sale — buyers can see it" : "Draft — only you can see it"}</SelectItem>)}</SelectContent></Select></Field>
      </Section>

      {error && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">{error}</p>}
      <StickyActionBar
        hint={valid ? `${animalTotal} animals · ready to save` : attempted ? `Still needed: ${missing.join(", ")}.` : `${missing.length} required item${missing.length === 1 ? "" : "s"} left`}
        hintTone={valid ? "success" : attempted ? "danger" : "muted"}
      >
        <Button onClick={submit} disabled={submitting} className="h-12 w-full rounded-2xl text-base font-semibold">{submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}{editing ? "Save changes" : "Save bulk listing"}</Button>
      </StickyActionBar>
    </div>
  );
}

function Section({ title, children }) { return <section className="soft-card mt-5 space-y-4 rounded-[1.5rem] p-4 sm:p-5"><h2 className="border-b border-border/60 pb-3 text-base font-extrabold">{title}</h2>{children}</section>; }
function Field({ label, required = false, error = "", children }) { return <div className="space-y-1.5"><Label className="text-sm font-semibold">{label}{required && <span className="text-destructive" aria-hidden="true"> *</span>}</Label>{children}{error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}</div>; }
function CountSummary({ label, value }) { return <div className="rounded-2xl bg-muted/55 p-3 text-center"><p className="text-xl font-extrabold text-primary">{value}</p><p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p></div>; }
