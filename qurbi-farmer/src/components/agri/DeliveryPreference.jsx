import React, { useState, useEffect } from "react";
import { qurbi } from "@/api/qurbiClient";
import { Button } from "@/components/ui/button";
import { Truck, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import DeliveryMethodCards from "@/components/agri/DeliveryMethodCards";

export default function DeliveryPreference({ profile }) {
  const { toast } = useToast();
  const profileValue = profile?.deliveryPreference || "";
  const [savedValue, setSavedValue] = useState(profileValue);
  const [value, setValue] = useState(profileValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Keep in sync when the profile loads after mount.
  useEffect(() => {
    setSavedValue(profileValue);
    setValue(profileValue);
    setError("");
  }, [profileValue]);

  const dirty = value !== savedValue;

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      await qurbi.entities.FarmerProfile.update(profile.id, {
        deliveryPreference: value,
      });
      // Re-fetch and only confirm if the stored value matches.
      const refetched = await qurbi.entities.FarmerProfile.filter({
        userId: profile.userId,
      });
      const fresh = refetched?.[0];
      if (fresh?.deliveryPreference === value) {
        setSavedValue(fresh.deliveryPreference);
        toast({ title: "Delivery method updated", description: "Your preference has been saved to your farmer profile." });
      } else {
        setError("Could not confirm the save. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Truck className="w-4 h-4 text-primary" />
        </span>
        <div>
          <p className="text-base font-semibold">Delivery method</p>
          <p className="text-sm text-muted-foreground">How you deliver livestock to buyers</p>
        </div>
      </div>
      <DeliveryMethodCards
        value={value}
        onChange={(v) => {
          setValue(v);
          setError("");
        }}
      />
      <div className="flex items-center justify-between mt-3 min-h-[20px]">
        {error ? (
          <span role="alert" className="text-sm text-destructive">{error}</span>
        ) : (
          <span className="text-sm text-muted-foreground">{dirty ? "Unsaved changes" : "\u00A0"}</span>
        )}
        <Button onClick={save} disabled={!dirty || saving} className="h-11 rounded-xl px-5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          Save
        </Button>
      </div>
    </div>
  );
}
