import React, { useEffect, useState } from "react";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { farmerProfileApi, farmVerificationApi } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertCircle, ArrowLeft, ArrowRight, Camera, Loader2, UserCheck } from "lucide-react";
import BrandLogo from "@/components/agri/BrandLogo";
import DeliveryMethodCards from "@/components/agri/DeliveryMethodCards";
import DocUploader from "@/components/agri/DocUploader";
import FormField, { scrollToField } from "@/components/agri/FormField";
import StepIndicator from "@/components/agri/StepIndicator";
import StickyActionBar from "@/components/agri/StickyActionBar";
import { MALAYSIA_STATES, userVal } from "@/lib/agri";
import { getFarmerVerificationDraft, saveFarmerVerificationDraft } from "@/lib/farmerVerificationDraft";

const STEPS = [
  { n: 1, label: "Farm Details" },
  { n: 2, label: "Policy & Terms" },
];

const EMPTY_FORM = {
  name: "", phoneNumber: "", icNumber: "", farmName: "", address: "", city: "", postcode: "", state: "", deliveryPreference: "",
};

const IC_TIPS = ["All 4 corners of the card are in the photo", "Name and IC number are sharp and readable", "No glare, flash reflection or fingers covering it"];

export default function FarmerVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const savedDraft = getFarmerVerificationDraft();
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    name: userVal(user, "name") || user?.full_name || "",
    ...(savedDraft?.form || {}),
  }));
  const [docs, setDocs] = useState(() => ({
    icFront: null,
    icBack: null,
    selfieImage: null,
    farmerCertificate: null,
    ...(savedDraft?.docs || {}),
  }));
  const [loading, setLoading] = useState(!savedDraft);
  const [error, setError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    farmerProfileApi.byUser(user.id)
      .then(async (profile) => {
        const verificationPage = profile
          ? await farmVerificationApi.list({ page: 1, limit: 1 })
          : null;
        const verification = verificationPage?.data?.[0];
        if (verification?.rejectionReason) setRejectionReason(verification.rejectionReason);
        if (savedDraft) return;
        const documents = verification?.documents || {};
        const personalDetails = documents.personalDetails || {};
        if (profile) {
          setForm({
            name: userVal(user, "name") || user?.full_name || "",
            phoneNumber: personalDetails.phoneNumber || "",
            icNumber: personalDetails.icNumber || "",
            farmName: profile.farmName || "",
            address: profile.farmAddressLine || "",
            city: profile.farmCity || "",
            postcode: profile.farmPostcode || "",
            state: profile.farmState || "",
            deliveryPreference: personalDetails.deliveryPreference || profile.deliveryPreference || "",
          });
        }
        if (verification) {
          setDocs({
            icFront: documents.icFront || null,
            icBack: documents.icBack || null,
            selfieImage: documents.selfieImage || null,
            farmerCertificate: documents.farmerCertificate || null,
          });
        }
      })
      .catch(() => { if (!savedDraft) setError("Your previous details couldn't be loaded. You can still fill in this form."); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const missing = [
    !form.name.trim() && { id: "name", label: "Full name", message: "Enter your full name as shown on your IC." },
    !form.phoneNumber.trim() && { id: "phoneNumber", label: "Phone number", message: "Enter a phone number buyers and QURBI can reach." },
    !form.icNumber.trim() && { id: "icNumber", label: "IC number", message: "Enter your IC number, e.g. 900312-11-5087." },
    !form.farmName.trim() && { id: "farmName", label: "Farm name", message: "Enter your farm's name." },
    !form.address.trim() && { id: "address", label: "Farm address", message: "Enter the farm address." },
    !form.city.trim() && { id: "city", label: "City", message: "Enter the city or town." },
    !form.postcode.trim() && { id: "postcode", label: "Postcode", message: "Enter the postcode." },
    !form.state && { id: "state", label: "State", message: "Choose the state." },
    !form.deliveryPreference && { id: "deliveryPreference", label: "Delivery method", message: "Choose how you will deliver to buyers." },
    !docs.icFront && { id: "icFront", label: "Front of IC", message: "Upload a photo of the front of your IC." },
    !docs.icBack && { id: "icBack", label: "Back of IC", message: "Upload a photo of the back of your IC." },
    !docs.selfieImage && { id: "selfieImage", label: "Selfie", message: "Take a selfie so we can match it to your IC." },
  ].filter(Boolean);
  const valid = missing.length === 0;
  const errorFor = (id) => (attempted ? missing.find((item) => item.id === id)?.message : undefined);

  const next = () => {
    if (!valid) {
      setAttempted(true);
      scrollToField(missing.map((item) => item.id));
      return;
    }
    saveFarmerVerificationDraft({ form, docs });
    navigate("/verify/policy");
  };

  const status = userVal(user, "verificationStatus");
  // A rejected farmer may fix and resend their application (from /rejected, or with a saved draft).
  const resubmitting = status === "Rejected" && (searchParams.get("resubmit") === "1" || Boolean(savedDraft));
  if (status === "Approved") return <Navigate to="/" replace />;
  if (status === "Pending") return <Navigate to="/pending" replace />;
  if (status === "Rejected" && !resubmitting) return <Navigate to="/rejected" replace />;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pb-6 pt-5">
        <div className="mb-6 flex items-center justify-between">
          <button type="button" onClick={() => navigate(resubmitting ? "/rejected" : "/login")} aria-label="Go back" className="flex h-11 w-11 items-center justify-center rounded-full bg-muted"><ArrowLeft className="h-5 w-5" /></button>
          <BrandLogo compact />
          <div className="w-11" />
        </div>

        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UserCheck className="h-6 w-6" /></div>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight">{resubmitting ? "Fix & resubmit" : "Farmer verification"}</h1>
            <p className="text-sm text-muted-foreground">Takes about 5 minutes. Have your IC ready.</p>
          </div>
        </div>

        <StepIndicator current={1} steps={STEPS} className="mt-5" />

        {resubmitting && rejectionReason && (
          <div role="note" className="mt-5 rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-destructive"><AlertCircle className="h-4 w-4" />What to fix</p>
            <p className="mt-1.5 text-base leading-relaxed text-foreground">{rejectionReason}</p>
            <p className="mt-2 text-sm text-muted-foreground">Your previous details are filled in below. Change what&apos;s needed, then continue.</p>
          </div>
        )}

        <p className="mt-5 text-sm text-muted-foreground"><span className="font-bold text-destructive">*</span> Required</p>

        <FormSection title="1. About you">
          <FormField id="name" label="Full name (as on IC)" required error={errorFor("name")}><Input id="name" value={form.name} onChange={set("name")} autoComplete="name" placeholder="Ahmad bin Ali" className="h-12 text-base" /></FormField>
          <FormField id="phoneNumber" label="Phone number" required error={errorFor("phoneNumber")}><Input id="phoneNumber" type="tel" value={form.phoneNumber} onChange={set("phoneNumber")} inputMode="tel" autoComplete="tel" placeholder="012-345 6789" className="h-12 text-base" /></FormField>
          <FormField id="icNumber" label="IC number" required error={errorFor("icNumber")} hint="12 digits, e.g. 900312-11-5087"><Input id="icNumber" value={form.icNumber} onChange={set("icNumber")} inputMode="numeric" autoComplete="off" placeholder="XXXXXX-XX-XXXX" className="h-12 text-base" /></FormField>
        </FormSection>

        <FormSection title="2. Your farm">
          <FormField id="farmName" label="Farm name" required error={errorFor("farmName")}><Input id="farmName" value={form.farmName} onChange={set("farmName")} placeholder="e.g. Ladang Ternakan Ali" className="h-12 text-base" /></FormField>
          <FormField id="address" label="Farm address" required error={errorFor("address")}><Input id="address" value={form.address} onChange={set("address")} autoComplete="street-address" placeholder="Lot 12, Jalan..." className="h-12 text-base" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField id="city" label="City" required error={errorFor("city")}><Input id="city" value={form.city} onChange={set("city")} autoComplete="address-level2" placeholder="Kuantan" className="h-12 text-base" /></FormField>
            <FormField id="postcode" label="Postcode" required error={errorFor("postcode")}><Input id="postcode" value={form.postcode} onChange={set("postcode")} inputMode="numeric" autoComplete="postal-code" maxLength={5} placeholder="25000" className="h-12 text-base" /></FormField>
          </div>
          <FormField id="state" label="State" required error={errorFor("state")}>
            <Select value={form.state} onValueChange={(state) => setForm((current) => ({ ...current, state }))}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>{MALAYSIA_STATES.map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField id="deliveryPreference" label="How will you deliver to buyers?" required error={errorFor("deliveryPreference")} hint="You can change this later in your profile.">
            <DeliveryMethodCards value={form.deliveryPreference} onChange={(deliveryPreference) => setForm((current) => ({ ...current, deliveryPreference }))} />
          </FormField>
        </FormSection>

        <FormSection title="3. Identity documents" description="Only QURBI admins see these. They are used to confirm you are a real farmer.">
          <div className="rounded-2xl bg-muted/60 p-3.5">
            <p className="flex items-center gap-2 text-sm font-bold"><Camera className="h-4 w-4 text-primary" />For clear IC photos</p>
            <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">{IC_TIPS.map((tip) => <li key={tip}>• {tip}</li>)}</ul>
          </div>
          <DocUploader id="icFront" label="Front of IC" required value={docs.icFront} error={errorFor("icFront")} uploadLabel="Tap to photograph the front" onChange={(icFront) => setDocs((current) => ({ ...current, icFront }))} />
          <DocUploader id="icBack" label="Back of IC" required value={docs.icBack} error={errorFor("icBack")} uploadLabel="Tap to photograph the back" onChange={(icBack) => setDocs((current) => ({ ...current, icBack }))} />
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.035] p-4">
            <DocUploader
              id="selfieImage"
              label="Selfie"
              required
              capture="user"
              aspectClassName="mx-auto aspect-square max-w-[240px]"
              fittingType="fill"
              uploadLabel="Take a selfie"
              replaceLabel="Retake"
              hint="A clear, recent photo of your face. An admin compares it with your IC photo."
              value={docs.selfieImage}
              error={errorFor("selfieImage")}
              onChange={(selfieImage) => setDocs((current) => ({ ...current, selfieImage }))}
            />
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li>• Face the camera in good light.</li>
              <li>• Remove sunglasses, mask or anything covering your face.</li>
              <li>• Only you in the photo.</li>
            </ul>
          </div>
          <DocUploader
            label="Farm certificate (optional)"
            hint="Not every farmer has one. You can continue without it."
            value={docs.farmerCertificate}
            onChange={(farmerCertificate) => setDocs((current) => ({ ...current, farmerCertificate }))}
          />
        </FormSection>

        {error && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}

        <StickyActionBar
          standalone
          hint={valid ? "All done. Next, read and sign the farmer policy." : attempted ? `Still needed: ${missing.map((item) => item.label).join(", ")}.` : `${missing.length} required item${missing.length === 1 ? "" : "s"} left`}
          hintTone={valid ? "success" : attempted ? "danger" : "muted"}
        >
          <Button onClick={next} className="h-12 w-full rounded-2xl text-base font-semibold">
            Next: policy &amp; sign <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </StickyActionBar>
      </div>
    </div>
  );
}

/**
 * @param {{ title: React.ReactNode, description?: React.ReactNode, children?: React.ReactNode }} props
 */
function FormSection({ title, description, children }) {
  return (
    <section className="mt-5 space-y-4 rounded-[1.5rem] border border-border/75 bg-card p-4 shadow-[0_4px_14px_rgba(65,54,45,0.05)]">
      <div>
        <h2 className="text-lg font-extrabold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
