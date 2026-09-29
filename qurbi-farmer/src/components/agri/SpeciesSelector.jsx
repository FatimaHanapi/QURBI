import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SPECIES } from "@/lib/agri";

/**
 * @param {{ value?: string, onChange: (selection: { species: string, speciesRequestId: string, speciesApprovalStatus: string }) => void }} props
 */
export default function SpeciesSelector({ value, onChange }) {
  const supportedValue = SPECIES.includes(value) ? value : "";

  return (
    <div className="space-y-2">
      <Select
        value={supportedValue}
        onValueChange={(species) => onChange({
          species,
          speciesRequestId: "",
          speciesApprovalStatus: "Approved",
        })}
      >
        <SelectTrigger className="h-12"><SelectValue placeholder="Select species" /></SelectTrigger>
        <SelectContent>
          {SPECIES.map((species) => <SelectItem key={species} value={species}>{species}</SelectItem>)}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">QURBI currently supports Cow and Goat listings only.</p>
      {value && !supportedValue && (
        <p className="text-xs font-medium text-destructive">This legacy species is no longer supported. Select Cow or Goat to continue.</p>
      )}
    </div>
  );
}
