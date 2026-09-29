import React, { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { farmerProfileApi, farmVerificationApi, uploadApi } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import SignaturePad from "@/components/agri/SignaturePad";
import StepIndicator from "@/components/agri/StepIndicator";
import StickyActionBar from "@/components/agri/StickyActionBar";
import { cn } from "@/lib/utils";
import { FARMER_POLICY_VERSION, userVal } from "@/lib/agri";
import { clearFarmerVerificationDraft, getFarmerVerificationDraft } from "@/lib/farmerVerificationDraft";

const STEPS = [{ n: 1, label: "Farm Details" }, { n: 2, label: "Policy & Terms" }];
const POLICY_POINTS = [
  { id: "identity-storage", title: "IC, selfie and document storage", text: "I consent to QURBI securely storing my IC, selfie and submitted documents for manual identity verification and account administration." },
  { id: "platform-markup", title: "20% platform markup", text: "I understand QURBI may add a 20% markup on top of the price I set for livestock displayed to buyers." },
  { id: "accurate-information", title: "Accurate information", text: "I confirm my personal, farm, livestock and pricing information is truthful, complete and kept up to date." },
  { id: "animal-compliance", title: "Animal health and legal compliance", text: "I am responsible for animal welfare and compliance with applicable Malaysian livestock, health, permit and movement requirements." },
  { id: "delivery-responsibility", title: "Delivery responsibility", text: "I will fulfil orders according to my selected delivery method and cooperate with QURBI where platform delivery is selected." },
  { id: "privacy-enforcement", title: "Privacy and platform enforcement", text: "I will protect buyer information and accept that QURBI may review, reject or suspend accounts that breach these terms." },
];

export default function FarmerRegistrationPolicy() {
  const navigate = useNavigate();
  const { user, checkUserAuth } = useAuth();
  const draft = getFarmerVerificationDraft();
  const today = new Date().toISOString().slice(0, 10);
  const [accepted, setAccepted] = useState([]);
  const [name, setName] = useState(() => draft?.form?.name || userVal(user, "name") || user?.full_name || "");
  const [date, setDate] = useState(today);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const signatureRef = useRef(null);
  const submittingRef = useRef(false);
  const status = userVal(user, "verificationStatus");
  const draftReady = Boolean(
    draft?.form?.name?.trim() && draft?.form?.phoneNumber?.trim() && draft?.form?.icNumber?.trim()
    && draft?.form?.farmName?.trim() && draft?.form?.address?.trim() && draft?.form?.city?.trim()
    && draft?.form?.postcode?.trim() && draft?.form?.state
    && draft?.form?.deliveryPreference && draft?.docs?.icFront && draft?.docs?.icBack && draft?.docs?.selfieImage
  );

  useEffect(() => {
    if (!draftReady) navigate("/verify", { replace: true });
  }, [draftReady, navigate]);

  if (status === "Approved") return <Navigate to="/" replace />;
  if (status === "Pending") return <Navigate to="/pending" replace />;
  // A rejected farmer who filled the form again (draft saved) may resubmit.
  if (status === "Rejected" && !draftReady) return <Navigate to="/rejected" replace />;
  if (!draftReady) return null;

  const allAccepted = POLICY_POINTS.every((point) => accepted.includes(point.id));
  const valid = Boolean(allAccepted && name.trim() && date && hasSignature);
  const toggle = (id, checked) => setAccepted((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id));

  const submit = async () => {
    if (!valid || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      let uploadedSignature = signatureUrl;
      if (!uploadedSignature) {
        const dataUrl = signatureRef.current?.toDataURL();
        const blob = await (await fetch(dataUrl)).blob();
        const upload = await uploadApi.upload(
          new File([blob], "farmer-registration-signature.png", { type: "image/png" }),
          "private",
        );
        uploadedSignature = upload.fileUrl;
        if (!uploadedSignature) throw new Error("Signature upload failed.");
        setSignatureUrl(uploadedSignature);
      }

      const profileDetails = {
        farmName: draft.form.farmName,
        farmAddressLine: draft.form.address,
        farmCity: draft.form.city,
        farmState: draft.form.state,
        farmPostcode: draft.form.postcode,
        deliveryPreference: draft.form.deliveryPreference,
      };
      const existingProfile = await farmerProfileApi.byUser(user.id);
      if (existingProfile) await farmerProfileApi.update(existingProfile.id, profileDetails);
      else await farmerProfileApi.create(profileDetails);

      await farmVerificationApi.submit({
        signatureUrl: uploadedSignature,
        documents: {
          icFront: draft.docs.icFront,
          icBack: draft.docs.icBack,
          selfieImage: draft.docs.selfieImage,
          policySignerName: name.trim(),
          policySignedDate: date,
          policySignature: uploadedSignature,
          policyVersion: FARMER_POLICY_VERSION,
          policyConsents: POLICY_POINTS.map((point) => point.id),
          farmerCertificate: draft.docs.farmerCertificate || "",
          personalDetails: {
            fullName: draft.form.name.trim(),
            phoneNumber: draft.form.phoneNumber,
            icNumber: draft.form.icNumber,
            deliveryPreference: draft.form.deliveryPreference,
          },
        },
      });
      clearFarmerVerificationDraft();
      await checkUserAuth();
      navigate("/pending", { replace: true });
    } catch (submissionError) {
      setError(submissionError.response?.data?.error || submissionError.message || "Submission failed. Your details are saved on this device; please try again.");
      setSubmitting(false);
    } finally {
      submittingRef.current = false;
    }
  };

  const acceptedCount = POLICY_POINTS.filter((point) => accepted.includes(point.id)).length;
  const missing = [
    !allAccepted && `tick all ${POLICY_POINTS.length} points (${acceptedCount} done)`,
    !name.trim() && "your name",
    !date && "the date",
    !hasSignature && "your signature",
  ].filter(Boolean);
  const trySubmit = () => {
    if (!valid) { setAttempted(true); return; }
    submit();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pb-6 pt-5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate("/verify")} aria-label="Back to farm details" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight">Policy &amp; terms</h1>
            <p className="text-sm text-muted-foreground">Last step before we review your account.</p>
          </div>
        </div>
        <StepIndicator current={2} steps={STEPS} className="mt-5" />

        <section className="mt-5">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-extrabold">1. Read and tick each point</h2>
            <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", allAccepted ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground")}>{acceptedCount} of {POLICY_POINTS.length}</span>
          </div>
          <div className="mt-3 space-y-3">
            {POLICY_POINTS.map((point, index) => {
              const checked = accepted.includes(point.id);
              return (
                <label key={point.id} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors", checked ? "border-primary/40 bg-primary/5" : attempted ? "border-destructive/40 bg-card" : "border-border bg-card")}>
                  <Checkbox checked={checked} onCheckedChange={(value) => toggle(point.id, value === true)} className="mt-0.5 h-5 w-5" />
                  <span className="text-base leading-relaxed"><strong>{index + 1}. {point.title}</strong><span className="mt-1 block text-sm text-muted-foreground">{point.text}</span></span>
                </label>
              );
            })}
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" />Policy version: {FARMER_POLICY_VERSION}</p>
        </section>

        <section className="mt-5 space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-extrabold">2. Sign</h2>
          <div className="space-y-1.5">
            <Label htmlFor="policy-name">Full name <span className="text-destructive" aria-hidden="true">*</span></Label>
            <Input id="policy-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="h-12 text-base" />
            {attempted && !name.trim() && <p role="alert" className="text-sm font-medium text-destructive">Enter your full name.</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="policy-date">Date <span className="text-destructive" aria-hidden="true">*</span></Label>
            <Input id="policy-date" type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} className="h-12" />
          </div>
          <div className="space-y-1.5"><Label>Signature <span className="text-destructive" aria-hidden="true">*</span></Label><SignaturePad ref={signatureRef} onInk={setHasSignature} showError={attempted && !hasSignature} /></div>
        </section>

        <div className="mt-5 rounded-2xl bg-muted/60 p-4 text-sm leading-relaxed text-muted-foreground">
          <p className="font-bold text-foreground">What happens next?</p>
          <p className="mt-1">A QURBI admin checks your IC, selfie and farm details — usually within 1–2 working days. You&apos;ll be able to list livestock once approved.</p>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">{error}</p>}

        <StickyActionBar
          standalone
          hint={valid ? "Ready to send for review." : `To submit: ${missing.join(", ")}.`}
          hintTone={valid ? "success" : attempted ? "danger" : "muted"}
        >
          <Button variant="outline" onClick={() => navigate("/verify")} disabled={submitting} className="h-12 w-[34%] shrink-0 rounded-2xl">Back</Button>
          <Button onClick={trySubmit} disabled={submitting} className="h-12 flex-1 rounded-2xl text-base font-semibold">
            {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />} {submitting ? "Sending..." : "Submit for review"}
          </Button>
        </StickyActionBar>
      </div>
    </div>
  );
}
