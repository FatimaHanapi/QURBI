import React from "react";
import { ArrowLeft } from "lucide-react";
import PageLoading from "@/components/PageLoading";
import { useHeaderTransition } from "@/components/HeaderTransitionProvider";

/** Keeps the product-detail hero and sheet mounted while its data is loading. */
export default function DetailPageLoading({ message, backTo, backLabel }) {
  const { navigateWithTransition } = useHeaderTransition();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#41362D] to-[#6B594A]">
      <div className="relative h-72 bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2]">
        <button
          type="button"
          onClick={() => navigateWithTransition(backTo)}
          aria-label={backLabel}
          className="absolute left-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-xl border border-[#E3C19F] bg-gradient-to-br from-[#41362D] to-[#6B594A] text-white shadow-lg transition-transform active:scale-90"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <main className="relative z-10 mx-auto -mt-12 min-h-[calc(100dvh-15rem)] max-w-5xl rounded-t-[32px] bg-gradient-to-br from-[#41362D] to-[#6B594A] px-4 pb-28 pt-5 text-white shadow-xl shadow-black/20">
        <PageLoading contentOnly message={message} />
      </main>
    </div>
  );
}
