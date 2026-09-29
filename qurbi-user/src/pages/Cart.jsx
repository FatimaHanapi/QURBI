import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, ShoppingCart, Check, ChevronRight } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { GRADE_COLORS } from "@/lib/livestock-data";
import { useReveal } from "@/hooks/useReveal";
import { checkCartAvailability } from "@/lib/livestock-availability";
import { isProductExpired } from "@/lib/product-expiry";
import AppHeader from "@/components/AppHeader";
import { useHeaderTransition } from "@/components/HeaderTransitionProvider";
import { AisyahCardSkeleton } from "@/components/AisyahLoading";

const isUnobtainable = (result) =>
  result?.available === false && result?.state !== "reserved_by_you";

function CartItemImage({ item }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!item.image || imageFailed) {
    return (
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] px-1 text-center text-[10px] font-bold text-[#41362D]">
        No image
      </div>
    );
  }

  return (
    <img
      src={item.image}
      alt={item.listing_name || item.breed || "Cart product"}
      className="h-12 w-12 flex-shrink-0 rounded-xl object-cover"
      onError={() => setImageFailed(true)}
    />
  );
}

function DeleteCartModal({ request, onCancel, onConfirm }) {
  if (!request) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-cart-title" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-3xl border border-[#F7EDE2]/30 bg-gradient-to-br from-[#41362D] to-[#6B594A] p-5 text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <h2 id="delete-cart-title" className="text-lg font-bold text-white">Delete {request.multiple ? "selected items" : "item"}?</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#F7EDE2]">
          {request.multiple ? `${request.count} selected items will be removed from your cart.` : `${request.label || "This item"} will be removed from your cart.`}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-[#F7EDE2] text-sm font-bold text-white">Keep Item</button>
          <button type="button" onClick={onConfirm} className="min-h-11 rounded-xl border border-[#41362D] bg-gradient-to-br from-[#EF4444] to-[#B91C1C] text-sm font-bold text-white shadow-sm shadow-red-950/25">Delete</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AvailabilityModal({ message, onClose }) {
  if (!message) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-5 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="cart-availability-title">
      <div className="w-full max-w-sm rounded-3xl border border-[#F7EDE2]/40 bg-gradient-to-br from-[#41362D] to-[#6B594A] p-5 text-white shadow-2xl">
        <h2 id="cart-availability-title" className="text-lg font-bold text-white">Product unavailable</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#F7EDE2]">{message}</p>
        <button type="button" onClick={onClose} className="mt-5 min-h-11 w-full rounded-xl border border-[#F7EDE2] bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] text-sm font-bold text-[#41362D]">
          Okay
        </button>
      </div>
    </div>,
    document.body,
  );
}

export default function Cart() {
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
      setAvailabilityError(
        "We couldn't verify current stock. Your cart has not been changed.",
      );
    } finally {
      setCheckingStock(false);
    }
  }, [cartItems]);
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
    setAvailabilityNotice(
      "This product is already reserved by another buyer and has been removed from your cart.",
    );
  }, [availability, cartItems, removeFromCart]);

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
            ? "This product is already reserved by another buyer and has been removed from your cart."
            : expired
              ? "This product listing has expired and cannot be purchased while waiting for farmer renewal."
              : "One or more selected products are currently unobtainable. Please review your cart before payment.",
        );
        return;
      }
      navigateWithTransition("/payment");
    } catch {
      setAvailabilityNotice(
        "We couldn't verify current availability. Please try again before payment.",
      );
    } finally {
      setCheckingStock(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="aisyah-page flex flex-col">
        <AppHeader title="Your Cart" subtitle="0 items" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
            <ShoppingCart className="w-10 h-10 text-gray-300" />
          </div>
          <p className="text-gray-400 text-center">Your cart is empty.</p>
          <button
            onClick={() => navigateWithTransition("/browse")}
            className="aisyah-primary-button"
          >
            Browse livestock
          </button>
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

  return (
    <div className="aisyah-page overflow-x-hidden pb-56 sm:pb-52">
      <AppHeader
        title="Your Cart"
        subtitle={`${totalItems} head · ${selectedItems.length} selected`}
      />

      {/* Selection Toolbar */}
      {createPortal(
        <div className="fixed bottom-[calc(9.75rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-3 sm:px-4">
          <div
            className={`mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-50 bg-white p-3 shadow-sm ${reveal()}`}
            style={{ animationDelay: "80ms" }}
          >
          <button
            onClick={toggleAllSelectable}
            className="flex items-center gap-2 active:scale-95 transition-transform"
          >
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-md border-2 ${allSelected ? "border-[#16A34A] bg-gradient-to-br from-[#16A34A] to-[#22C55E]" : "border-gray-200"}`}
            >
              {allSelected && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm font-semibold text-gray-700">
              Select All
            </span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {selectedKeys.length}/{cartItems.length} selected
            </span>
            {selectedKeys.length > 0 && (
              <button
                onClick={() => setDeleteRequest({ multiple: true, count: selectedKeys.length })}
                className="flex min-h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#EF4444] to-[#B91C1C] px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-red-950/25 transition-transform active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5 text-white" /> Delete
              </button>
            )}
          </div>
        </div>
        </div>,
        document.body,
      )}

      <div className="aisyah-content">

        {/* Cart Items */}
        {checkingStock && !hasAvailability ? (
          <AisyahCardSkeleton
            count={Math.min(Math.max(cartItems.length, 1), 5)}
            variant="list"
          />
        ) : availabilityError && !hasAvailability ? (
          <div className="rounded-2xl border border-red-200 bg-white/60 p-5 text-center shadow-sm">
            <p className="text-sm text-red-700">{availabilityError}</p>
            <button
              type="button"
              onClick={refreshAvailability}
              className="mt-3 rounded-xl bg-gradient-to-br from-[#41362D] to-[#6B594A] px-5 py-2.5 text-sm font-bold text-white"
            >
              Retry stock check
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-content-ready">
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
              return (
                <div
                  key={item.key}
                  role={detailPath ? "link" : undefined}
                  tabIndex={detailPath ? 0 : undefined}
                  aria-label={
                    detailPath
                      ? `Open ${item.item_type === "bulk" ? item.listing_name : item.breed} details`
                      : undefined
                  }
                  onClick={(event) => {
                    if (event.target.closest("button, a, input")) return;
                    openDetail();
                  }}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openDetail();
                    }
                  }}
                  className={`min-w-0 overflow-hidden rounded-2xl border bg-white p-3 shadow-sm sm:p-4 ${detailPath ? "cursor-pointer" : ""} ${unavailable ? "border-orange-200 bg-orange-50/30" : selectedKeys.includes(item.key) ? "qurbi-cart-item-selected" : "border-gray-50"} ${reveal()}`}
                  style={{ animationDelay: `${120 + idx * 60}ms` }}
                >
              <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    onClick={() => toggleSelect(item.key)}
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border-2 transition-all active:scale-90 ${selectedKeys.includes(item.key) ? "border-[#16A34A] bg-gradient-to-br from-[#16A34A] to-[#22C55E]" : "border-gray-200 bg-white"}`}
                  >
                    {selectedKeys.includes(item.key) && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </button>
                  <CartItemImage item={item} />
                  <div className="min-w-0">
                    <p className="break-words [overflow-wrap:anywhere] font-bold text-gray-900">
                      {item.item_type === "bulk"
                        ? item.listing_name
                        : item.breed}
                    </p>
                    <p className="break-words text-xs text-gray-400">
                      {item.item_type === "bulk"
                        ? `${item.total_animals} animals · Bulk lot`
                        : item.animal}
                    </p>
                    {unavailable && (
                      <p
                        className={`mt-1 inline-flex rounded-lg px-2 py-1 text-xs font-bold ${
                          expired
                            ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-[#41362D]"
                            : "bg-gradient-to-br from-[#41362D] to-[#6B594A] text-white"
                        }`}
                      >
                        {expired
                          ? "Expired"
                          : availabilityResult?.state === "reserved"
                          ? "Reserved by another buyer"
                          : availabilityResult?.state === "listing_expired"
                            ? "Expired — waiting for farmer renewal"
                            : "Unavailable / Out of Stock"}
                      </p>
                    )}
                    {reservedByYou && (
                      <p className="mt-1 inline-flex rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 px-2 py-1 text-xs font-bold text-[#41362D]">
                        Complete Payment
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-none items-center gap-1">
                  {item.grade && (
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold ${GRADE_COLORS[item.grade]}`}
                    >
                      {item.grade}
                    </span>
                  )}
                  <button
                    onClick={() => setDeleteRequest({ key: item.key, label: item.item_type === "bulk" ? item.listing_name : item.breed })}
                    aria-label={`Delete ${item.item_type === "bulk" ? item.listing_name : item.breed} from cart`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DC2626]/60 bg-white/90 text-[#DC2626] shadow-sm transition-transform active:scale-90"
                  >
                    <Trash2 className="h-4 w-4 text-[#DC2626]" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  {item.item_type === "bulk" ? (
                    <p className="text-gray-400 text-xs">
                      {item.male_count || 0} male · {item.female_count || 0}{" "}
                      female · {item.state || "Location not specified"}
                    </p>
                  ) : (
                    item.weight_min > 0 && (
                      <p className="text-gray-400 text-xs">
                        ⚖️{" "}
                        {item.weight_min === item.weight_max
                          ? item.weight_min
                          : `${item.weight_min}–${item.weight_max}`}{" "}
                        kg
                      </p>
                    )
                  )}
                  <p className="text-gray-900 font-bold">
                    RM {item.price_per_head.toLocaleString()}
                    {item.item_type === "bulk" ? " / lot" : "/head"}
                  </p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-50 flex justify-between">
                <span className="text-gray-400 text-xs">
                  Subtotal (
                  {item.item_type === "bulk"
                    ? "1 lot"
                    : `${item.quantity} head`}
                  )
                </span>
                <span className="text-gray-900 font-bold text-sm">
                  RM {item.total.toLocaleString()}
                </span>
              </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed Payment Button */}
      {createPortal(
        <div className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 animate-fade-in-up px-3 sm:px-4">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-3 rounded-2xl bg-gradient-to-br from-[#41362D] to-[#6B594A] p-2.5 shadow-xl shadow-black/20 sm:p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-white/70">
                {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} selected
              </p>
              <p className="truncate text-base font-bold leading-tight text-white sm:text-lg">
                RM {selectedSubtotal.toLocaleString()}
              </p>
            </div>
            <button
              onClick={proceedToPayment}
              disabled={
                selectedItems.length === 0 ||
                checkingStock ||
                Boolean(availabilityError)
              }
              className="flex min-h-10 flex-none items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] px-4 py-2 text-sm font-bold text-black transition-all duration-200 ease-out hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 sm:px-5 sm:text-base"
            >
              {checkingStock ? "Checking stock..." : "Payment"}{" "}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>,
        document.body,
      )}
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
