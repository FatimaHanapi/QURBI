import React from "react";
import { useTranslation } from "react-i18next";

const pulse = "animate-pulse bg-[#41362D]/10";

export function QurbiCardSkeleton({ count = 6, variant = "grid" }) {
  const { t } = useTranslation("common");
  if (variant === "list") {
    return (
      <div
        className="w-full space-y-3"
        aria-label={t("qurbiLoading.loadingContent")}
      >
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-2xl border border-[#41362D]/15 bg-white/55 p-4"
          >
            <div className={`h-12 w-12 flex-none rounded-xl ${pulse}`} />
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className={`h-3.5 w-2/3 rounded-full ${pulse}`} />
              <div className={`h-3 w-5/6 rounded-full ${pulse}`} />
              <div className={`h-2.5 w-1/4 rounded-full ${pulse}`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3"
      aria-label={t("qurbiLoading.loadingProducts")}
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="h-[238px] overflow-hidden rounded-2xl border border-[#41362D]/15 bg-white/55"
        >
          <div className={`h-32 w-full ${pulse}`} />
          <div className="space-y-2.5 p-3">
            <div className={`h-3.5 w-3/4 rounded-full ${pulse}`} />
            <div className={`h-3 w-1/2 rounded-full ${pulse}`} />
            <div className={`h-3 w-full rounded-full ${pulse}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function QurbiPageLoader({ label }) {
  const { t } = useTranslation("common");
  const resolvedLabel = label ?? t("qurbiLoading.loading");
  return (
    <div className="qurbi-page flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-3xl border border-[#41362D]/15 bg-white/55 p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`h-14 w-14 flex-none rounded-2xl ${pulse}`} />
          <div className="flex-1 space-y-3">
            <div className={`h-4 w-2/3 rounded-full ${pulse}`} />
            <div className={`h-3 w-full rounded-full ${pulse}`} />
          </div>
        </div>
        <p className="mt-5 text-center text-xs font-semibold text-[#41362D]/55">
          {resolvedLabel}
        </p>
      </div>
    </div>
  );
}

export function LivestockDetailSkeleton() {
  const { t } = useTranslation("common");
  return (
    <div
      className="min-h-screen overflow-hidden bg-gradient-to-br from-[#41362D] to-[#6B594A]"
      aria-label={t("qurbiLoading.loadingLivestockDetails")}
    >
      <div className="h-72 animate-pulse bg-gradient-to-br from-[#E3C19F]/70 to-[#F7EDE2]/80" />
      <div className="relative -mt-7 min-h-[55vh] rounded-t-[32px] border-t border-white/20 bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] px-5 pb-28 pt-7">
        <div className={`h-7 w-2/3 rounded-full ${pulse}`} />
        <div className={`mt-3 h-4 w-1/3 rounded-full ${pulse}`} />
        <div className="mt-6 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="rounded-2xl bg-gradient-to-br from-[#41362D]/90 to-[#6B594A]/90 p-4"
            >
              <div className="h-3 w-1/2 animate-pulse rounded-full bg-white/20" />
              <div className="mt-3 h-4 w-3/4 animate-pulse rounded-full bg-white/30" />
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-[#41362D]/15 bg-white/55 p-4">
          <div className={`h-4 w-1/3 rounded-full ${pulse}`} />
          <div className={`mt-3 h-3 w-full rounded-full ${pulse}`} />
          <div className={`mt-2 h-3 w-5/6 rounded-full ${pulse}`} />
        </div>
      </div>
    </div>
  );
}
