import React from "react";
import PageTransitionOutlet from "@/components/PageTransitionOutlet";

export default function StandaloneLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2]">
      <PageTransitionOutlet />
    </div>
  );
}
