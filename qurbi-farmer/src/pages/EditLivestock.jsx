import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { qurbi } from "@/api/qurbiClient";
import { ArrowLeft, Loader2 } from "lucide-react";
import LivestockForm from "@/components/agri/LivestockForm";
import { useToast } from "@/components/ui/use-toast";
import { hasActivePaymentReservation, reservationExpiryLabel } from "@/lib/livestockReservation";
import { listingExpiry, marketplaceVisibility, newListingWindow } from "@/lib/agri";

export default function EditLivestock() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [livestock, setLivestock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    qurbi.functions.invoke("checkLivestockReservation", { livestockId: id })
      .catch(() => null)
      .then(() => qurbi.entities.Livestock.get(id))
      .then(setLivestock)
      .catch(() => navigate("/livestock", { replace: true }))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      let update = data;
      if (listingExpiry(livestock).expired && data.status === "Available") {
        const now = new Date();
        update = { ...data, ...newListingWindow(now), listingRenewedAt: now.toISOString() };
        const visibility = marketplaceVisibility(update);
        update.marketplaceVisible = visibility.visible;
        update.marketplaceVisibilityReason = visibility.reason;
      }
      await qurbi.entities.Livestock.update(id, update);
      toast({ title: "Changes saved", description: listingExpiry(livestock).expired && data.status === "Available" ? "Your listing is visible to buyers for another 14 days." : "Your listing has been updated." });
      navigate(`/livestock/${id}`, { replace: true });
    } catch (err) {
      toast({ title: "Couldn't save your changes", description: err.message || "Please check your connection and try again.", variant: "destructive" });
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  }
  if (!livestock) return null;
  const listingExpired = livestock.status === "Available" && listingExpiry(livestock).expired;
  if (hasActivePaymentReservation(livestock)) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <button type="button" onClick={() => navigate(`/livestock/${id}`)} aria-label="Back to livestock details" className="soft-card flex h-11 w-11 items-center justify-center rounded-2xl"><ArrowLeft className="h-5 w-5" /></button>
        <div className="mt-6 rounded-3xl bg-amber-100/80 p-6 text-amber-950">
          <h1 className="text-xl font-extrabold">Listing temporarily reserved</h1>
          <p className="mt-2 text-sm leading-6">A buyer is completing payment. Editing is locked until {reservationExpiryLabel(livestock)} so the animal cannot accidentally become available to another order.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back to livestock details" className="soft-card flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Edit Livestock</h1>
          <p className="mt-1 text-sm text-muted-foreground">{listingExpired ? "Review the details and confirm this animal is still available for the next 14 days." : "Update listing information and availability."}</p>
        </div>
      </div>
      <div className="mt-6">
        <LivestockForm initial={livestock} onSubmit={handleSubmit} submitting={submitting} submitLabel={listingExpired ? "Save & Renew for 14 Days" : "Save Changes"} />
      </div>
    </div>
  );
}
