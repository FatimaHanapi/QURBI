import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Trash2, ShoppingCart, Check, ChevronRight, Scale } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { GRADE_COLORS } from "@/lib/livestock-data";
import { useReveal } from "@/hooks/useReveal";
import { checkCartAvailability } from "@/lib/livestock-availability";
import { isProductExpired } from "@/lib/product-expiry";
import AppHeader from "@/components/AppHeader";
import { useHeaderTransition } from "@/components/HeaderTransitionProvider";
import { AisyahCardSkeleton } from "@/components/AisyahLoading";
import StickyActionBar from "@/components/shop/StickyActionBar";
import { formatRM } from "@/lib/format";

const isUnobtainable = (result) =>
  result?.available === false && result?.state !== "reserved_by_you";

function CartItemImage({ item }) {
  const { t } = useTranslation("cart");
  const [imageFailed, setImageFailed] = useState(false);

  if (!item.image || imageFailed) {
    return (
      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] px-1 text-center text-[11px] font-bold leading-tight text-[#41362D]">
        {t("cart.noImage")}
      </div>
    );
  }

  return (
    <img
      src={item.image}
      alt=""
      className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
      onError={() => setImageFailed(true)}
    />
  );
}

function DeleteCartModal({ request, onCancel, onConfirm }) {
  const { t } = useTranslation("cart");
  if (!request) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-cart-title" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-3xl border border-[#F7EDE2]/30 bg-gradient-to-br from-[#41362D] to-[#6B594A] p-5 text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <h2 id="delete-cart-title" className="text-lg font-bold text-white">{request.multiple ? t("cart.deleteModalTitleMultiple") : t("cart.deleteModalTitleSingle")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#F7EDE2]">
          {request.multiple ? t("cart.deleteModalBodyMultiple", { count: request.count }) : t("cart.deleteModalBodySingle", { label: request.label || t("cart.thisItem") })}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-[#F7EDE2] text-sm font-bold text-white">{t("cart.keepItem")}</button>
          <button type="button" onClick={onConfirm} className="min-h-11 rounded-xl border border-[#41362D] bg-gradient-to-br from-[#EF4444] to-[#B91C1C] text-sm font-bold text-white shadow-sm shadow-red-950/25">{t("cart.delete")}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AvailabilityModal({ message, onClose }) {
  const { t } = useTranslation("cart");
  if (!message) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-5 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="cart-availability-title">
      <div className="w-full max-w-sm rounded-3xl border border-[#F7EDE2]/40 bg-gradient-to-br from-[#41362D] to-[#6B594A] p-5 text-white shadow-2xl">
        <h2 id="cart-availability-title" className="text-lg font-bold text-white">{t("cart.productUnavailableTitle")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#F7EDE2]">{message}</p>
        <button type="button" onClick={onClose} className="mt-5 min-h-11 w-full rounded-xl border border-[#F7EDE2] bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] text-sm font-bold text-[#41362D]">
          {t("cart.okay")}
        </button>
      </div>
    </div>,
    document.body,
  );
}

export default function Cart() {
  const { t } = useTranslation("cart");
  const { t: tf } = useTranslation("shopflow");
  const {
    cartItems,
    removeFromCart,
    updateQty,
    totalItems,
    selectedKeys,
    toggleSelect,
    removeSelected,
    selectedItems,
    selectedSubtotal,
  } = useCart();
  const { navigateWithTransition } = useHeaderTransition();
  const { reveal } = useReveal();
  const [availability, setAvailability] = useState({});
  const [checkingStock, setCheckingStock] = useState(true);
  const [availabilityError, setAvailabilityError] = useState("");
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [availabilityNotice, setAvailabilityNotice] = useState("");
  const refreshAvailability = useCallback(async () => {
    setCheckingStock(true);
    setAvailabilityError("");
    try {
      setAvailability(await checkCartAvailability(cartItems));
    } catch {
      setAvailabilityError(t("cart.stockCheckError"));
    } finally {
      setCheckingStock(false);
    }
  }, [cartItems, t]);
  useEffect(() => {
    refreshAvailability();
  }, [refreshAvailability]);
  const hasAvailability = Object.keys(availability).length > 0;

  useEffect(() => {
    const removed = cartItems.filter((item) =>
      availability[item.key]?.state === "reserved",
    );
    if (!removed.length) return;

    removed.forEach((item) => removeFromCart(item.key));
    setAvailabilityNotice(t("cart.reservedRemovedNotice"));
  }, [availability, cartItems, removeFromCart, t]);

  const proceedToPayment = async () => {
    if (!selectedItems.length || checkingStock || availabilityError) return;
    setCheckingStock(true);
    try {
      const latest = await checkCartAvailability(selectedItems);
      setAvailability((current) => ({ ...current, ...latest }));
      const blocked = selectedItems.filter(
        (item) => isUnobtainable(latest[item.key]),
      );
      if (blocked.length) {
        const reserved = blocked.some(
          (item) => latest[item.key]?.state === "reserved",
        );
        const expired = blocked.some(
          (item) => latest[item.key]?.state === "expired",
        );
        blocked
          .filter((item) => latest[item.key]?.state === "reserved")
          .forEach((item) => removeFromCart(item.key));
        setAvailabilityNotice(
          reserved
            ? t("cart.reservedRemovedNotice")
            : expired
              ? t("cart.expiredListingNotice")
              : t("cart.unobtainableNotice"),
        );
        return;
      }
      navigateWithTransition("/payment");
    } catch {
      setAvailabilityNotice(t("cart.verifyAvailabilityFailedNotice"));
    } finally {
      setCheckingStock(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="aisyah-page flex flex-col">
        <AppHeader title={t("cart.title")} subtitle={t("cart.emptySubtitle")} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F7EDE2] shadow-sm">
            <ShoppingCart aria-hidden="true" className="h-10 w-10 text-[#6B594A]" />
          </div>
          <p className="text-lg font-bold text-[#41362D]">{t("cart.emptyMessage")}</p>
          <p className="max-w-xs text-sm text-[#6B594A]">{tf("cart.emptyHint")}</p>
          <div className="flex w-full max-w-xs flex-col gap-2">
            <button
              type="button"
              onClick={() => navigateWithTransition("/browse")}
              className="aisyah-primary-button min-h-12"
            >
              {t("cart.browseLivestock")}
            </button>
            <button
              type="button"
              onClick={() => navigateWithTransition("/bulk-buy")}
              className="min-h-12 rounded-xl border-2 border-[#41362D]/60 px-4 text-sm font-bold text-[#41362D]"
            >
              {tf("cart.browseBulk")}
            </button>
          </div>
        </div>
        <AvailabilityModal
          message={availabilityNotice}
          onClose={() => setAvailabilityNotice("")}
        />
      </div>
    );
  }

  const selectableKeys = cartItems.map((item) => item.key);
  const allSelected =
    selectableKeys.length > 0 &&
    selectableKeys.every((key) => selectedKeys.includes(key));
  const toggleAllSelectable = () => {
    selectableKeys.forEach((key) => {
      if (allSelected === selectedKeys.includes(key)) toggleSelect(key);
    });
  };
  const itemName = (item) =>
    item.item_type === "bulk" ? item.listing_name : item.title || item.breed;
  const payDisabled =
    selectedItems.length === 0 || checkingStock || Boolean(availabilityError);

  return (
    <div className="aisyah-page qurbi-action-bar-space overflow-x-hidden">
      <AppHeader
        title={t("cart.title")}
        subtitle={t("cart.subtitleSummary", {
          total: totalItems,
          selected: selectedItems.length,
        })}
      />

      <div className="aisyah-content max-w-2xl">
        {/* Selection toolbar */}
        <div
          className={`flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#41362D]/15 bg-[#F7EDE2]/85 px-2 py-1 ${reveal()}`}
          style={{ animationDelay: "80ms" }}
        >
          <button
            type="button"
            role="checkbox"
            aria-checked={allSelected}
            onClick={toggleAllSelectable}
            className="flex min-h-11 items-center gap-2.5 rounded-xl px-2 transition-transform active:scale-95"
          >
            <span
              aria-hidden="true"
              className={`flex h-6 w-6 items-center justify-center rounded-md border-2 ${allSelected ? "border-[#41362D] bg-[#41362D]" : "border-[#41362D]/60 bg-[#F7EDE2]"}`}
            >
              {allSelected && <Check className="h-4 w-4 text-[#F7EDE2]" strokeWidth={3} />}
            </span>
            <span className="text-sm font-bold text-[#41362D]">
              {t("cart.selectAll")}
            </span>
            <span className="text-sm font-medium text-[#6B594A]">
              {t("cart.selectedCount", {
                selected: selectedKeys.length,
                total: cartItems.length,
              })}
            </span>
          </button>
          {selectedKeys.length > 0 && (
            <button
              type="button"
              onClick={() => setDeleteRequest({ multiple: true, count: selectedKeys.length })}
              aria-label={tf("cart.removeSelected")}
              className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-[#6B594A] underline-offset-4 transition-colors hover:text-[#41362D] hover:underline"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" /> {tf("cart.removeShort")}
            </button>
          )}
        </div>

        {/* Cart Items */}
        {checkingStock && !hasAvailability ? (
          <AisyahCardSkeleton
            count={Math.min(Math.max(cartItems.length, 1), 5)}
            variant="list"
          />
        ) : availabilityError && !hasAvailability ? (
          <div className="rounded-2xl border border-[#41362D]/20 bg-[#F7EDE2]/90 p-5 text-center shadow-sm" role="alert">
            <p className="text-sm font-semibold text-[#41362D]">{availabilityError}</p>
            <button
              type="button"
              onClick={refreshAvailability}
              className="aisyah-primary-button mt-3 min-h-12 px-5"
            >
              {t("cart.retryStockCheck")}
            </button>
          </div>
        ) : (
          <ul className="space-y-3 animate-content-ready" aria-label={t("cart.title")}>
            {cartItems.map((item, idx) => {
              const availabilityResult = availability[item.key];
              const reservedByYou =
                availabilityResult?.state === "reserved_by_you";
              const expired =
                item.item_type !== "bulk" &&
                (availabilityResult?.state === "expired" ||
                  isProductExpired(item));
              const unavailable =
                expired || isUnobtainable(availabilityResult);
              const selected = selectedKeys.includes(item.key);
              const name = itemName(item);
              const detailId =
                item.item_type === "bulk"
                  ? item.bulk_listing_id || item.id
                  : item.livestock_id || item.id;
              const detailPath = detailId && !unavailable
                ? item.item_type === "bulk"
                  ? `/bulk-buy/${encodeURIComponent(detailId)}?from=cart`
                  : `/livestock/${encodeURIComponent(detailId)}?from=cart`
                : "";
              const openDetail = () => {
                if (detailPath) navigateWithTransition(detailPath);
              };
              const subtitle =
                item.item_type === "bulk"
                  ? t("cart.bulkAnimalsCount", { count: item.total_animals })
                  : [item.animal, item.title && item.breed !== item.title ? item.breed : ""]
                      .filter(Boolean)
                      .join(" · ");
              return (
                <li
                  key={item.key}
                  className={`min-w-0 overflow-hidden rounded-2xl border-2 bg-gradient-to-br from-[#41362D] to-[#6B594A] p-3 text-white shadow-sm sm:p-4 ${unavailable ? "border-[#B45309]/70" : selected ? "qurbi-cart-item-selected" : "border-transparent"} ${reveal()}`}
                  style={{ animationDelay: `${120 + idx * 60}ms` }}
                >
                  <div className="flex min-w-0 items-start gap-1">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={selected}
                      aria-label={tf("cart.selectItemAria", { name })}
                      onClick={() => toggleSelect(item.key)}
                      className="-ml-1 -mt-1 flex h-11 w-11 flex-none items-center justify-center rounded-xl transition-transform active:scale-90"
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors ${selected ? "border-[#E3C19F] bg-[#E3C19F]" : "border-[#F7EDE2]/70 bg-transparent"}`}
                      >
                        {selected && <Check className="h-4 w-4 text-[#41362D]" strokeWidth={3} />}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={openDetail}
                      disabled={!detailPath}
                      aria-label={
                        detailPath
                          ? t("cart.openDetailsAriaLabel", { name })
                          : undefined
                      }
                      className="flex min-w-0 flex-1 items-start gap-3 rounded-xl text-left disabled:cursor-default"
                    >
                      <CartItemImage item={item} />
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-base font-bold leading-snug text-white [overflow-wrap:anywhere]">
                          {name}
                        </span>
                        {subtitle && (
                          <span className="mt-0.5 block break-words text-sm text-white/75">
                            {subtitle}
                          </span>
                        )}
                        {item.grade && (
                          <span
                            className={`mt-1 inline-flex rounded-lg px-2 py-0.5 text-xs font-bold ${GRADE_COLORS[item.grade] || "bg-[#E3C19F] text-[#41362D]"}`}
                          >
                            {tf("card.grade", { grade: item.grade })}
                          </span>
                        )}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteRequest({ key: item.key, label: name })}
                      aria-label={t("cart.deleteAriaLabel", { name })}
                      className="-mr-1 -mt-1 flex h-11 w-11 flex-none items-center justify-center rounded-lg text-[#F7EDE2]/70 transition-colors hover:bg-[#F7EDE2]/10 hover:text-white"
                    >
                      <Trash2 aria-hidden="true" className="h-5 w-5" />
                    </button>
                  </div>

                  {(unavailable || reservedByYou) && (
                    <div className="mt-2 pl-10">
                      {unavailable && (
                        <p
                          className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ${
                            expired
                              ? "bg-[#FEF3C7] text-[#78350F]"
                              : "bg-[#F7EDE2] text-[#41362D]"
                          }`}
                        >
                          {expired
                            ? t("cart.expired")
                            : availabilityResult?.state === "reserved"
                            ? t("cart.reservedByAnother")
                            : availabilityResult?.state === "listing_expired"
                              ? t("cart.listingExpiredAwaitingRenewal")
                              : t("cart.unavailable")}
                        </p>
                      )}
                      {reservedByYou && (
                        <p className="inline-flex rounded-lg bg-[#FEF3C7] px-2 py-1 text-xs font-bold text-[#78350F]">
                          {t("cart.completePayment")}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-end justify-between gap-3 border-t border-[#F7EDE2]/15 pt-3 pl-10">
                    <div className="min-w-0">
                      {item.item_type === "bulk" ? (
                        <p className="text-sm text-white/75">
                          {t("cart.bulkGenderSummary", {
                            male: item.male_count || 0,
                            female: item.female_count || 0,
                            location: item.state || t("cart.locationNotSpecified"),
                          })}
                        </p>
                      ) : (
                        item.weight_min > 0 && (
                          <p className="flex items-center gap-1 text-sm text-white/75">
                            <Scale aria-hidden="true" className="h-3.5 w-3.5" />
                            {item.weight_min === item.weight_max
                              ? item.weight_min
                              : `${item.weight_min}–${item.weight_max}`}{" "}
                            kg
                          </p>
                        )
                      )}
                      <p className="text-sm text-white/75">
                        {formatRM(item.price_per_head)}
                        {item.item_type === "bulk"
                          ? t("cart.perLot")
                          : t("cart.perHead")}
                      </p>
                    </div>
                    <div className="flex-none text-right">
                      <p className="text-xs text-white/70">
                        {t("cart.subtotalLabel", {
                          detail:
                            item.item_type === "bulk"
                              ? t("cart.oneLot")
                              : t("cart.headCount", { count: item.quantity }),
                        })}
                      </p>
                      <p className="text-lg font-extrabold text-white">
                        {formatRM(item.total)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Sticky checkout bar */}
      <StickyActionBar tone="dark" label={tf("cart.checkoutBarLabel")}>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white/80">
            {selectedItems.length
              ? t("cart.selectedItemsCount", { count: selectedItems.length })
              : t("cart.selectAtLeastOne")}
          </p>
          <p className="text-xl font-extrabold leading-tight text-white">
            {formatRM(selectedSubtotal)}
          </p>
        </div>
        <button
          type="button"
          onClick={proceedToPayment}
          disabled={payDisabled}
          className="flex min-h-12 flex-none items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] px-5 text-base font-bold text-[#41362D] transition-all duration-200 ease-out active:scale-[0.98] disabled:opacity-60"
        >
          {checkingStock ? (
            <>
              <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-[#41362D] border-t-transparent" />
              {t("cart.checkingStock")}
            </>
          ) : (
            <>
              {tf("cart.continueToPayment")} <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </>
          )}
        </button>
      </StickyActionBar>
      <DeleteCartModal
        request={deleteRequest}
        onCancel={() => setDeleteRequest(null)}
        onConfirm={() => {
          if (deleteRequest?.multiple) removeSelected();
          else if (deleteRequest?.key) removeFromCart(deleteRequest.key);
          setDeleteRequest(null);
        }}
      />
      <AvailabilityModal
        message={availabilityNotice}
        onClose={() => setAvailabilityNotice("")}
      />
    </div>
  );
}
