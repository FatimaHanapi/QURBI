import React from "react";
import { Leaf } from "lucide-react";
import { useTranslation } from "react-i18next";

function LoadingIndicator({ message }) {
  const { t } = useTranslation("common");
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative h-14 w-14" aria-hidden="true">
        <div className="absolute inset-0 rounded-full border-4 border-[#6B594A]/20" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-r-[#6B594A] border-t-[#41362D]" />
      </div>

      <p className="mt-5 text-base font-bold text-[#41362D]">{message}</p>
      <p className="mt-1 text-sm font-medium text-[#6B594A]">
        {t("pageLoading.pleaseWait")}
      </p>
    </div>
  );
}

export default function PageLoading({
  message,
  contentOnly = false,
  hideHeader = false,
}) {
  const { t } = useTranslation("common");
  const resolvedMessage = message ?? t("pageLoading.loading");
  if (contentOnly) {
    return (
      <div
        className="col-span-full flex min-h-[calc(100dvh-15rem)] w-full items-center justify-center px-6 pb-24"
        role="status"
        aria-live="polite"
        aria-label={resolvedMessage}
      >
        <LoadingIndicator message={resolvedMessage} />
      </div>
    );
  }

  if (hideHeader) {
    return (
      <div
        className="aisyah-page flex min-h-[100dvh] items-center justify-center px-6"
        role="status"
        aria-live="polite"
        aria-label={resolvedMessage}
      >
        <LoadingIndicator message={resolvedMessage} />
      </div>
    );
  }

  return (
    <div
      className="aisyah-page min-h-[100dvh]"
      role="status"
      aria-live="polite"
      aria-label={resolvedMessage}
    >
      <header className="qurbi-header-background relative z-20 overflow-hidden rounded-b-[28px] bg-gradient-to-br from-[#41362D] to-[#6B594A] px-4 pb-2 pt-3 shadow-lg sm:px-5 sm:pt-4">
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.28em] text-white/75">
            QURBI
          </p>
          <div className="mt-1 h-6 w-36 animate-pulse rounded-full bg-white/20" />
        </div>
      </header>

      <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center px-6 pb-24">
        <LoadingIndicator message={resolvedMessage} />
      </div>
    </div>
  );
}
