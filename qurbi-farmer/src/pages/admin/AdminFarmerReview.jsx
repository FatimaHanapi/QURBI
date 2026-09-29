import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { farmVerificationApi, farmerProfileApi, livestockApi, userApi } from "@/api/apiClient";
import {
  AlertCircle, BadgeCheck, Check, Clock, CreditCard, FileText, Home, Loader2, Mail, MapPin, PenLine, Phone,
  ShieldCheck, Truck, UserRound, X, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import EmptyState from "@/components/agri/EmptyState";
import CowSilhouetteIcon from "@/components/agri/CowSilhouetteIcon";
import StatusBadge from "@/components/agri/StatusBadge";
import { AdminCard, AdminPageHeader, InfoItem, StickyActionBar } from "@/components/admin/AdminUi";
import DocumentThumb from "@/components/admin/DocumentThumb";
import AdminLivestockRow from "@/components/admin/AdminLivestockRow";
import { formatDate, formatDateTime, verificationInfo } from "@/components/admin/adminFormat";
import { cn } from "@/lib/utils";

export default function AdminFarmerReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [farmer, setFarmer] = useState(null);
  const [profile, setProfile] = useState(null);
  const [verification, setVerification] = useState(null);
  const [livestock, setLivestock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [decision, setDecision] = useState(null);
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);

  useEffect(() => {
    Promise.all([
      userApi.get(id),
      farmerProfileApi.byUser(id),
      livestockApi.list({ farmerId: id, page: 1, limit: 100 }),
    ]).then(async ([farmerRow, profileRow, livestockPage]) => {
      const verificationPage = profileRow
        ? await farmVerificationApi.list({ farmerProfileId: profileRow.id, page: 1, limit: 1 })
        : null;
      setFarmer(farmerRow);
      setProfile(profileRow || null);
      setVerification(verificationPage?.data?.[0] || null);
      setLivestock(livestockPage.data || []);
    }).catch(() => navigate("/admin/farmers", { replace: true })).finally(() => setLoading(false));
  }, [id, navigate]);

  const openDecision = (value) => {
    setDecision(value);
    setReason("");
    setReasonTouched(false);
    setIdentityConfirmed(false);
  };

  const closeDecision = () => {
    if (acting) return;
    setDecision(null);
    setReason("");
    setReasonTouched(false);
    setIdentityConfirmed(false);
  };

  const review = async () => {
    if (!decision || !verification) return;
    if (decision === "reject" && !reason.trim()) { setReasonTouched(true); return; }
    const documents = verification.documents || {};
    if (decision === "approve" && documents.selfieImage && !identityConfirmed) return;
    setActing(true);
    const approved = decision === "approve";
    try {
      const updated = await farmVerificationApi.review(verification.id, {
        approve: approved,
        ...(approved ? {} : { rejectionReason: reason.trim() }),
      });
      const backendStatus = approved ? "verified" : "rejected";
      setProfile((current) => ({ ...current, verificationStatus: backendStatus }));
      setVerification(updated);
      setDecision(null);
      setReason("");
      setIdentityConfirmed(false);
      toast({ title: approved ? "Farmer approved" : "Verification rejected", description: approved ? `${farmer?.fullName || "The farmer"} can now sell on QURBI.` : "The farmer will see your reason and can resubmit." });
    } catch (error) {
      toast({ variant: "destructive", title: "Review failed", description: error.message || "Please try again." });
    } finally {
      setActing(false);
    }
  };

  if (loading) return <ReviewSkeleton />;
  if (!farmer) return null;

  const documents = verification?.documents || {};
  const personalDetails = documents.personalDetails || {};
  const rawStatus = String(profile?.verificationStatus || "").toLowerCase();
  const status = verificationInfo(rawStatus);
  const isPending = rawStatus === "pending" && Boolean(verification);
  const isRejected = rawStatus === "rejected";
  const isApproved = rawStatus === "verified" || rawStatus === "approved";
  const name = farmer.fullName || "Unnamed farmer";
  const applicantName = personalDetails.fullName || name;
  const address = [profile?.farmAddressLine, profile?.farmCity, profile?.farmPostcode].filter(Boolean).join(", ");
  const approveBlocked = decision === "approve" && Boolean(documents.selfieImage) && !identityConfirmed;
  const reasonError = decision === "reject" && reasonTouched && !reason.trim();

  return (
    <div className="animate-fade-in">
      <AdminPageHeader
        backTo="/admin/farmers"
        backLabel="Back to farmers"
        eyebrow="Farmer review"
        title={<span className="block break-words">{name}</span>}
        description={[profile?.farmName, profile?.farmState].filter(Boolean).join(" · ") || farmer.email}
        actions={<StatusBadge tone={status.tone} dot className="hidden sm:inline-flex">{status.label}</StatusBadge>}
      />

      <StatusBanner
        className="mt-4"
        status={status}
        isPending={isPending}
        isApproved={isApproved}
        isRejected={isRejected}
        verification={verification}
      />

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,1fr)]">
        <div className="min-w-0 space-y-5">
          {verification ? (
            <>
              <AdminCard
                title="Identity check"
                description="Does the selfie match the face on the IC, and do the details match the application?"
                action={<StatusBadge tone={verification.reviewedAt ? "success" : "warning"} dot className="shrink-0">{verification.reviewedAt ? "Reviewed" : "To check"}</StatusBadge>}
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-muted/45 p-3.5 sm:grid-cols-3">
                  <InfoItem icon={UserRound} label="Name on application" value={applicantName} className="col-span-2 sm:col-span-1" />
                  <InfoItem icon={CreditCard} label="IC number" value={personalDetails.icNumber} mono />
                  <InfoItem icon={Phone} label="Phone" value={personalDetails.phoneNumber || farmer.phone} mono />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <DocumentThumb label="Front of IC" url={documents.icFront} />
                  <DocumentThumb label="Applicant selfie" url={documents.selfieImage} emptyLabel="No selfie (legacy submission)" />
                </div>
                {verification.reviewedAt && <p className="mt-3 text-xs text-muted-foreground">Reviewed on {formatDateTime(verification.reviewedAt)}.</p>}
              </AdminCard>

              <AdminCard title="Supporting documents" description="Tap a document to view it full size.">
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  <DocumentThumb label="Back of IC" url={documents.icBack} />
                  <DocumentThumb label="Farm certificate" url={documents.farmerCertificate} />
                  <DocumentThumb label="Signature" url={verification.signatureUrl} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/60 pt-4 sm:grid-cols-3">
                  <InfoItem icon={PenLine} label="Signed by" value={documents.policySignerName} className="col-span-2 sm:col-span-1" />
                  <InfoItem icon={FileText} label="Signed on" value={formatDate(documents.policySignedDate, documents.policySignedDate)} />
                  <InfoItem icon={ShieldCheck} label="Policy version" value={documents.policyVersion} />
                </div>
              </AdminCard>
            </>
          ) : (
            <EmptyState icon={FileText} title="No verification submitted" description="This farmer has not submitted identity documents yet. They will appear here for review once submitted." />
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <AdminCard title="Contact & farm">
            <dl className="grid gap-3.5">
              <DetailRow icon={Mail} label="Email" value={farmer.email} />
              <DetailRow icon={Phone} label="Phone" value={personalDetails.phoneNumber || farmer.phone} />
              <DetailRow icon={Home} label="Farm name" value={profile?.farmName} />
              <DetailRow icon={MapPin} label="Farm address" value={address} />
              <DetailRow icon={MapPin} label="State" value={profile?.farmState} />
              <DetailRow icon={Truck} label="Delivery method" value={personalDetails.deliveryPreference || profile?.deliveryPreference} />
            </dl>
          </AdminCard>

          <section aria-labelledby="farmer-livestock-heading">
            <h2 id="farmer-livestock-heading" className="text-lg font-extrabold tracking-tight">Livestock</h2>
            <p className="text-sm text-muted-foreground">{livestock.length} listing{livestock.length === 1 ? "" : "s"} by this farmer</p>
            <div className="mt-3 grid gap-2.5">
              {livestock.length
                ? livestock.map((item) => <AdminLivestockRow key={item.id} item={item} onOpen={() => navigate(`/admin/livestock/${item.id}`)} />)
                : <EmptyState icon={CowSilhouetteIcon} title="No livestock yet" description="This farmer has not created any livestock listings." />}
            </div>
          </section>
        </div>
      </div>

      {isPending && (
        <StickyActionBar label="Verification decision">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 text-sm text-foreground sm:pl-1">
              <span className="font-extrabold">Decision needed.</span> <span className="text-muted-foreground">Check the IC and selfie first.</span>
            </p>
            <div className="grid grid-cols-[1fr_1.4fr] gap-2 sm:flex sm:shrink-0">
              <Button variant="outline" className="h-12 border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive sm:px-6" onClick={() => openDecision("reject")}><X className="h-4 w-4" />Reject</Button>
              <Button className="h-12 sm:px-8" onClick={() => openDecision("approve")}><Check className="h-4 w-4" />Approve farmer</Button>
            </div>
          </div>
        </StickyActionBar>
      )}

      <Dialog open={Boolean(decision)} onOpenChange={(open) => { if (!open) closeDecision(); }}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md rounded-3xl">
          <DialogHeader className="text-left">
            <DialogTitle>{decision === "approve" ? "Approve" : "Reject"} {name}?</DialogTitle>
            <DialogDescription>
              {decision === "approve" ? "The farmer will be verified and can publish livestock to the marketplace." : "The farmer will see your reason and can fix and resubmit their documents."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {decision === "approve" && documents.selfieImage && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary/25 bg-primary/[0.035] p-3">
                <Checkbox checked={identityConfirmed} onCheckedChange={(checked) => setIdentityConfirmed(checked === true)} className="mt-0.5" />
                <span className="text-sm leading-relaxed">I compared the applicant selfie with the front of the IC and confirm they appear to belong to the same person.</span>
              </label>
            )}
            {decision === "reject" && (
              <div className="space-y-1.5">
                <Label htmlFor="reject-reason">Reason shown to farmer <span className="text-destructive">*</span></Label>
                <Textarea
                  id="reject-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  onBlur={() => setReasonTouched(true)}
                  rows={4}
                  aria-invalid={reasonError}
                  aria-describedby="reject-reason-help"
                  placeholder="e.g. The IC photo is blurry — please upload a clearer picture of the front of your IC."
                  className={cn(reasonError && "border-destructive focus-visible:ring-destructive")}
                />
                <p id="reject-reason-help" className={cn("text-xs", reasonError ? "font-semibold text-destructive" : "text-muted-foreground")}>
                  {reasonError ? "A reason is required to reject." : "Be specific so the farmer knows what to fix."}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button variant="outline" onClick={closeDecision} disabled={acting}>Cancel</Button>
              <Button onClick={review} disabled={acting || (decision === "reject" && !reason.trim()) || approveBlocked} variant={decision === "approve" ? "default" : "destructive"}>
                {acting && <Loader2 className="h-4 w-4 animate-spin" />}
                {decision === "approve" ? "Confirm approval" : "Confirm rejection"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBanner({ status, isPending, isApproved, isRejected, verification, className }) {
  if (isPending) {
    return (
      <div className={cn("flex items-start gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 p-3.5 text-amber-900", className)}>
        <Clock className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 text-sm">
          <p className="font-extrabold">Waiting for your decision</p>
          <p className="mt-0.5 leading-5">Submitted {formatDate(verification?.createdAt || verification?.submittedAt, "recently")}. Compare the IC with the selfie, then approve or reject.</p>
        </div>
      </div>
    );
  }
  if (isApproved) {
    return (
      <div className={cn("flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-900", className)}>
        <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-sm"><span className="font-extrabold">Verified farmer.</span> {verification?.reviewedAt ? `Approved on ${formatDate(verification.reviewedAt)}.` : "No action needed."}</p>
      </div>
    );
  }
  if (isRejected) {
    return (
      <div className={cn("flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-3.5", className)}>
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0 text-sm">
          <p className="font-extrabold text-destructive">Rejected{verification?.reviewedAt ? ` on ${formatDate(verification.reviewedAt)}` : ""}</p>
          {verification?.rejectionReason && <p className="mt-1 break-words text-foreground"><span className="font-semibold">Reason given: </span>{verification.rejectionReason}</p>}
          <p className="mt-1 text-xs text-muted-foreground">The farmer can resubmit; it will return here as pending.</p>
        </div>
      </div>
    );
  }
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-3.5", className)}>
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
      <p className="text-sm"><span className="font-extrabold">{status.label}.</span> Nothing to review until the farmer submits their documents.</p>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted"><Icon className="h-4 w-4 text-muted-foreground" /></span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
        <dd className="break-words text-sm font-bold text-foreground">{value || "—"}</dd>
      </div>
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true">
      <div className="h-14 w-64 rounded-2xl bg-muted" />
      <div className="mt-4 h-16 rounded-2xl bg-muted" />
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="h-80 rounded-[1.25rem] bg-muted" />
        <div className="h-80 rounded-[1.25rem] bg-muted" />
      </div>
      <span className="sr-only">Loading farmer</span>
    </div>
  );
}
