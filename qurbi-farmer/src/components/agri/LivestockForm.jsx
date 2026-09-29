import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { AlertCircle, ChevronDown, Loader2, MapPin, RotateCcw, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUploader from "@/components/agri/ImageUploader";
import VideoUploader from "@/components/agri/VideoUploader";
import BreedSelector from "@/components/agri/BreedSelector";
import SpeciesSelector from "@/components/agri/SpeciesSelector";
import FormField, { scrollToField } from "@/components/agri/FormField";
import StickyActionBar from "@/components/agri/StickyActionBar";
import {
  GENDERS,
  FARMER_LISTING_STATUSES,
  LIVESTOCK_STATUS_META,
  MALAYSIA_STATES,
  formatAge,
  marketplaceEligibleFrom,
  marketplaceVisibility,
} from "@/lib/agri";
import { cn } from "@/lib/utils";

const STATUS_HELP = {
  Available: "Buyers can see and order this animal for the next 14 days.",
  Unavailable: "Saved, but hidden from buyers until you change it.",
  Draft: "Saved for later. Buyers can't see it yet.",
};

function todayForInput() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function legacyAge(initial) {
  const match = String(initial.age || "").match(/([0-9]+(?:\.[0-9]+)?)\s*(year|month)/i);
  if (!match) return { value: "", unit: "Months" };
  return { value: match[1], unit: match[2].toLowerCase().startsWith("year") ? "Years" : "Months" };
}

/** @typedef {{ id: string, label: string, message: string }} MissingField */

const LivestockForm = forwardRef(
  /**
   * @param {{ initial?: any, registeredState?: string, onSubmit: (data: any) => void | Promise<void>, submitting?: boolean, submitLabel?: string, hideActions?: boolean, onValidationChange?: (state: { missing: MissingField[], attempted: boolean }) => void }} props
   * @param {React.ForwardedRef<{ submit: () => boolean }>} ref
   */
  function LivestockForm({
  initial = {},
  registeredState = "",
  onSubmit,
  submitting,
  submitLabel = "Save Listing",
  hideActions = false,
  onValidationChange,
}, ref) {
  const previousAge = legacyAge(initial);
  const [showAdvanced, setShowAdvanced] = useState(Boolean(
    initial.weight || initial.height || initial.bodyLength || initial.chestGirth ||
    initial.tagNumber || initial.earTag || initial.rfid || initial.feedDetails || initial.specialNotes
  ));
  const [form, setForm] = useState({
    species: initial.species || "",
    speciesRequestId: initial.speciesRequestId || "",
    speciesApprovalStatus: initial.speciesApprovalStatus || "Approved",
    breed: initial.breed || "",
    breedId: initial.breedId || "",
    breedRequestId: initial.breedRequestId || "",
    breedApprovalStatus: initial.breedApprovalStatus || (initial.breed === "Unspecified" ? "Unspecified" : "Approved"),
    ageInputMode: initial.ageInputMode || (initial.birthDate ? "Birth Date" : "Age"),
    birthDate: initial.birthDate || "",
    ageValue: initial.ageValue ?? previousAge.value,
    ageUnit: initial.ageUnit || previousAge.unit,
    ageRecordedAt: initial.ageRecordedAt || todayForInput(),
    gender: initial.gender || "",
    state: initial.state || initial.farmLocation || registeredState || "",
    price: initial.price ?? "",
    color: initial.color || "",
    description: initial.description || "",
    weight: initial.weight || "",
    height: initial.height || "",
    bodyLength: initial.bodyLength || "",
    chestGirth: initial.chestGirth || "",
    tagNumber: initial.tagNumber || initial.earTag || "",
    rfid: initial.rfid || "",
    feedDetails: initial.feedDetails || "",
    specialNotes: initial.specialNotes || "",
    status: initial.status || "Available",
  });
  const [images, setImages] = useState(initial.images || []);
  const [videos, setVideos] = useState(initial.videos || []);
  const [cover, setCover] = useState(initial.coverImage || initial.images?.[0] || null);
  const [ageTouched, setAgeTouched] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setFromInput = (key) => (event) => setValue(key, event.target.value);

  const preview = useMemo(() => {
    const ageRecordedAt = ageTouched ? todayForInput() : form.ageRecordedAt;
    const data = { ...form, ageRecordedAt };
    return { age: formatAge(data), visibility: marketplaceVisibility(data) };
  }, [form, ageTouched]);

  const validAge = form.ageInputMode === "Birth Date"
    ? Boolean(form.birthDate) && form.birthDate <= todayForInput()
    : form.ageValue !== "" && Number(form.ageValue) >= 0;

  /** @type {MissingField[]} */
  const missing = useMemo(() => {
    const list = [];
    if (!images.length) list.push({ id: "photos", label: "Photo", message: "Add at least one photo of the animal." });
    if (!form.species) list.push({ id: "species", label: "Species", message: "Choose the species." });
    if (!form.gender) list.push({ id: "gender", label: "Gender", message: "Choose male or female." });
    if (!form.breed) list.push({ id: "breed", label: "Breed", message: "Choose a breed, or pick “Unspecified” if you're not sure." });
    if (!form.state) list.push({ id: "state", label: "State", message: "Choose the state where the animal is kept." });
    if (!validAge) list.push({ id: "age", label: "Age", message: form.ageInputMode === "Birth Date" ? "Enter a birth date that is not in the future." : "Enter the animal's current age." });
    if (form.price === "" || Number(form.price) < 0 || Number.isNaN(Number(form.price))) list.push({ id: "price", label: "Price", message: "Enter your selling price in RM." });
    if (!form.status) list.push({ id: "status", label: "Listing status", message: "Choose how this listing should be saved." });
    return list;
  }, [images.length, form.species, form.gender, form.breed, form.state, validAge, form.ageInputMode, form.price, form.status]);
  const valid = missing.length === 0;
  const errorFor = (id) => (attempted ? missing.find((item) => item.id === id)?.message : undefined);

  useEffect(() => {
    onValidationChange?.({ missing, attempted });
  }, [missing, attempted, onValidationChange]);

  const submit = () => {
    if (!valid) {
      setAttempted(true);
      scrollToField(missing.map((item) => item.id));
      return false;
    }

    const normalized = {
      ...form,
      ageValue: form.ageInputMode === "Age" ? Number(form.ageValue) : null,
      ageRecordedAt: ageTouched ? todayForInput() : form.ageRecordedAt,
      birthDate: form.ageInputMode === "Birth Date" ? form.birthDate : "",
      price: Number(form.price),
      images,
      videos,
      coverImage: cover || images[0] || null,
      farmLocation: form.state,
    };
    const visibility = marketplaceVisibility(normalized);
    onSubmit({
      ...normalized,
      age: formatAge(normalized),
      marketplaceVisible: visibility.visible,
      marketplaceVisibilityReason: visibility.reason,
      marketplaceEligibleFrom: marketplaceEligibleFrom(normalized),
    });
    return true;
  };

  useImperativeHandle(ref, () => ({ submit }));

  const changeSpecies = ({ species, speciesRequestId, speciesApprovalStatus }) => {
    setForm((current) => ({
      ...current,
      species,
      speciesRequestId,
      speciesApprovalStatus,
      breed: speciesApprovalStatus === "Pending" ? "Unspecified" : "",
      breedId: "",
      breedRequestId: "",
      breedApprovalStatus: "Unspecified",
    }));
  };

  const sectionDone = {
    1: images.length > 0,
    2: Boolean(form.species && form.gender && form.breed && form.state),
    3: validAge,
    4: form.price !== "" && Number(form.price) >= 0 && Boolean(form.status),
  };

  return (
    <div className="lg:grid lg:grid-cols-[1fr_1.3fr] lg:items-start lg:gap-8">
      <div className="mb-5 space-y-5 lg:sticky lg:top-6 lg:mb-0">
        <Section title="Photos & video" step={1} done={sectionDone[1]} description="Buyers decide from photos first.">
          <div className="space-y-5">
            <FormField id="photos" label="Photos" required error={errorFor("photos")}>
              <ImageUploader value={images} cover={cover} onChange={(nextImages, nextCover) => { setImages(nextImages); setCover(nextCover); }} />
            </FormField>
            <FormField label="Videos" optional>
              <VideoUploader value={videos} onChange={setVideos} />
            </FormField>
          </div>
        </Section>
      </div>

      <div className="space-y-5">
        <Section title="About the animal" step={2} done={sectionDone[2]}>
          <div className="space-y-4">
            <Grid>
              <FormField id="species" label="Species" required error={errorFor("species")}>
                <SpeciesSelector
                  value={form.species}
                  onChange={changeSpecies}
                />
              </FormField>
              <FormField id="gender" label="Gender" required error={errorFor("gender")}>
                <Select value={form.gender} onValueChange={(value) => setValue("gender", value)}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Male or female" /></SelectTrigger>
                  <SelectContent>{GENDERS.map((gender) => <SelectItem key={gender} value={gender}>{gender}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </Grid>

            <FormField id="breed" label="Breed" required error={errorFor("breed")} hint={!form.species ? "Choose the species first." : undefined}>
              {form.speciesApprovalStatus === "Pending" ? (
                <div className="space-y-2"><Input value="Unspecified" readOnly className="h-12 bg-muted" /><p className="text-sm text-muted-foreground">You can choose or request a breed after the species is approved.</p></div>
              ) : <BreedSelector
                species={form.species}
                value={form.breed}
                approvalStatus={form.breedApprovalStatus}
                requestId={form.breedRequestId}
                livestockId={initial.id}
                onChange={(breedFields) => setForm((current) => ({ ...current, ...breedFields }))}
              />}
            </FormField>

            <Grid>
              <FormField label="Colour" optional>
                <Input value={form.color} onChange={setFromInput("color")} placeholder="e.g. Brown and white" className="h-12" />
              </FormField>
              <FormField id="state" label="State" required error={errorFor("state")}>
                <Select value={form.state} onValueChange={(value) => setValue("state", value)}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>{MALAYSIA_STATES.map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </Grid>

            {registeredState && (
              <div className="flex min-h-11 items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {form.state === registeredState ? "Using your registered farm state." : "Using a different state for this animal."}
                </span>
                {form.state !== registeredState && (
                  <button type="button" onClick={() => setValue("state", registeredState)} className="flex min-h-11 shrink-0 items-center gap-1 px-2 font-semibold text-primary hover:underline">
                    <RotateCcw className="h-3.5 w-3.5" /> Use farm state
                  </button>
                )}
              </div>
            )}

            <FormField label="Description" optional hint="Health, temperament, what it has been fed — anything a buyer would ask.">
              <Textarea value={form.description} onChange={setFromInput("description")} placeholder="Describe this animal..." rows={3} className="resize-none text-base" />
            </FormField>
          </div>
        </Section>

        <Section title="Age" step={3} done={sectionDone[3]} description="Enter either the birth date or the current age.">
          <div id="field-age" className="scroll-mt-24 space-y-4">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How do you know the age?">
              {["Birth Date", "Age"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={form.ageInputMode === mode}
                  onClick={() => { setValue("ageInputMode", mode); setAgeTouched(true); }}
                  className={cn(
                    "min-h-11 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                    form.ageInputMode === mode ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  {mode === "Age" ? "I know its age" : "I know its birth date"}
                </button>
              ))}
            </div>

            {form.ageInputMode === "Birth Date" ? (
              <FormField label="Date of birth" required error={errorFor("age")}>
                <Input type="date" max={todayForInput()} value={form.birthDate} onChange={(event) => { setValue("birthDate", event.target.value); setAgeTouched(true); }} className="h-12" />
              </FormField>
            ) : (
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Age" required>
                    <Input type="number" inputMode="numeric" min="0" step="1" value={form.ageValue} onChange={(event) => { setValue("ageValue", event.target.value); setAgeTouched(true); }} placeholder="e.g. 14" aria-invalid={Boolean(errorFor("age"))} className="h-12" />
                  </FormField>
                  <FormField label="Unit" required>
                    <Select value={form.ageUnit} onValueChange={(value) => { setValue("ageUnit", value); setAgeTouched(true); }}>
                      <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Months">Months</SelectItem><SelectItem value="Years">Years</SelectItem></SelectContent>
                    </Select>
                  </FormField>
                </div>
                {errorFor("age") && <InlineError>{errorFor("age")}</InlineError>}
              </div>
            )}

            <p className="rounded-xl bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">Buyers will see: <span className="font-semibold text-foreground">{preview.age}</span>. It updates automatically as the animal grows.</p>
          </div>
        </Section>

        <Section title="Price & visibility" step={4} done={sectionDone[4]}>
          <div className="space-y-4">
            <FormField id="price" label="Selling price (RM)" required error={errorFor("price")} hint="The fixed price you want for this animal.">
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="number" inputMode="decimal" min="0" step="0.01" value={form.price} onChange={setFromInput("price")} placeholder="e.g. 2500" aria-invalid={Boolean(errorFor("price"))} className="h-12 pl-9 text-base" />
              </div>
            </FormField>
            <FormField id="status" label="Who can see this listing?" required error={errorFor("status")} hint={STATUS_HELP[form.status]}>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Listing status">
                {FARMER_LISTING_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    role="radio"
                    aria-checked={form.status === status}
                    onClick={() => setValue("status", status)}
                    className={cn(
                      "min-h-11 rounded-xl border px-2 py-2.5 text-sm font-semibold transition-colors",
                      form.status === status ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {LIVESTOCK_STATUS_META[status]?.label || status}
                  </button>
                ))}
              </div>
            </FormField>
            {form.status === "Available" && !preview.visibility.visible && preview.visibility.reason && !/^Status is/.test(preview.visibility.reason) && (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />Buyers won&apos;t see it yet: {preview.visibility.reason.charAt(0).toLowerCase() + preview.visibility.reason.slice(1)}.</p>
            )}
          </div>
        </Section>

        <div className="soft-card overflow-hidden rounded-[1.5rem]">
          <button type="button" onClick={() => setShowAdvanced((current) => !current)} aria-expanded={showAdvanced} className="flex min-h-[72px] w-full items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-muted/40">
            <span>
              <span className="block text-base font-bold">More details <span className="font-normal text-muted-foreground">(optional)</span></span>
              <span className="mt-0.5 block text-sm font-normal text-muted-foreground">Weight, size, tag number and feeding</span>
            </span>
            <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", showAdvanced && "rotate-180")} />
          </button>
          {showAdvanced && (
            <div className="animate-fade-in space-y-4 border-t border-border/60 px-5 pb-5 pt-4">
              <Grid>
                <FormField label="Weight (kg)"><Input inputMode="decimal" value={form.weight} onChange={setFromInput("weight")} className="h-12" /></FormField>
                <FormField label="Height (cm)"><Input inputMode="decimal" value={form.height} onChange={setFromInput("height")} className="h-12" /></FormField>
              </Grid>
              <Grid>
                <FormField label="Body length (cm)"><Input inputMode="decimal" value={form.bodyLength} onChange={setFromInput("bodyLength")} className="h-12" /></FormField>
                <FormField label="Chest girth (cm)"><Input inputMode="decimal" value={form.chestGirth} onChange={setFromInput("chestGirth")} className="h-12" /></FormField>
              </Grid>
              <Grid>
                <FormField label="Tag number"><Input value={form.tagNumber} onChange={setFromInput("tagNumber")} className="h-12" /></FormField>
                <FormField label="RFID number"><Input value={form.rfid} onChange={setFromInput("rfid")} className="h-12" /></FormField>
              </Grid>
              <FormField label="Feed / food given">
                <Textarea value={form.feedDetails} onChange={setFromInput("feedDetails")} placeholder="e.g. Napier grass, pellets and supplements" rows={2} className="resize-none text-base" />
              </FormField>
              <FormField label="Special notes"><Textarea value={form.specialNotes} onChange={setFromInput("specialNotes")} rows={2} className="resize-none text-base" /></FormField>
            </div>
          )}
        </div>
      </div>

      {!hideActions && (
        <div className="lg:col-span-2">
          <StickyActionBar
            hint={attempted && missing.length ? <MissingSummary missing={missing} /> : undefined}
            hintTone="danger"
          >
            <Button onClick={submit} disabled={submitting} className="h-12 w-full rounded-2xl text-base font-semibold">
              {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}{submitLabel}
            </Button>
          </StickyActionBar>
        </div>
      )}
    </div>
  );
});

export default LivestockForm;

/** "Still needed: Photo, Breed, Price" — each item jumps to its field. */
export function MissingSummary({ missing }) {
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="font-semibold">Still needed:</span>
      {missing.map((item, index) => (
        <span key={item.id} className="whitespace-nowrap">
          <button type="button" onClick={() => scrollToField([item.id])} className="min-h-6 font-semibold underline underline-offset-2">{item.label}</button>
          {index < missing.length - 1 && <span aria-hidden="true">,</span>}
        </span>
      ))}
    </span>
  );
}

function InlineError({ children }) {
  return <p role="alert" className="flex items-start gap-1.5 text-sm font-medium text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{children}</p>;
}

/**
 * @param {{ title: React.ReactNode, step: number, done?: boolean, description?: React.ReactNode, children?: React.ReactNode }} props
 */
function Section({ title, step, done = false, description, children }) {
  return (
    <section className="soft-card rounded-[1.5rem] p-4 sm:p-5">
      <div className="mb-5 flex items-center gap-3 border-b border-border/60 pb-4">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm", done ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground")} aria-hidden="true">{done ? "✓" : step}</span>
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Grid({ children }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}
