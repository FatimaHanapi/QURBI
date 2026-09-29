import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, ShoppingCart } from "lucide-react";
import { formatRM } from "@/lib/format";

/** Shared cart summary shown at the top of marketplace content. */
export default function ViewCartCard({ totalItems, totalPrice }) {
  const { t } = useTranslation("listings");
  if (totalItems <= 0) return null;

  return (
    <Link
      to="/cart"
      viewTransition
      className="mx-4 mt-4 flex min-h-[60px] items-center gap-3 rounded-2xl border border-[#41362D]/25 bg-gradient-to-br from-[#41362D] to-[#6B594A] px-4 py-3 text-left text-white shadow-lg shadow-black/15 transition-all duration-300 ease-out hover:scale-[1.005] active:translate-y-0.5 active:scale-[0.995] sm:mx-auto sm:max-w-3xl"
      aria-label={t("viewCartCard.viewCartAria", { count: totalItems })}
    >
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-white/15">
        <ShoppingCart className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">
          {t("viewCartCard.itemsInCart", { count: totalItems })}
        </span>
        <span className="mt-0.5 block text-sm font-bold text-[#F7EDE2]">
          {formatRM(totalPrice)}
        </span>
      </span>

      <span className="flex flex-none items-center gap-1 text-sm font-bold text-white">
        {t("viewCartCard.viewCart")} <ChevronRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
