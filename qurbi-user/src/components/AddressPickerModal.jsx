import React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { MapPin, Check, Plus, X } from "lucide-react";

export default function AddressPickerModal({ addresses, selectedId, onSelect, onAddNew, onClose }) {
  const { t } = useTranslation("cart");
  const { t: tf } = useTranslation("shopflow");
  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="address-picker-title"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-br from-[#41362D] to-[#6B594A] pb-4 max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex flex-shrink-0 items-start justify-between border-b border-[#F7EDE2]/25 px-5 py-4">
          <div>
            <h3 id="address-picker-title" className="text-white font-bold text-lg">{t("addressPickerModal.heading")}</h3>
            <p className="text-[#F7EDE2]/85 text-sm mt-0.5">{t("addressPickerModal.savedAddressesCount", { count: addresses.length })}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("addressPickerModal.closeAriaLabel")}
            className="flex h-11 items-center gap-1 rounded-xl border border-[#F7EDE2] bg-gradient-to-br from-[#41362D] to-[#6B594A] px-3 text-sm font-semibold text-white transition-transform active:scale-95"
          >
            <X className="h-4 w-4" /> {t("addressPickerModal.close")}
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
          {addresses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <MapPin className="w-10 h-10 text-[#F7EDE2] mb-2" />
              <p className="text-[#F7EDE2]/80 text-sm">{t("addressPickerModal.noAddressesSaved")}</p>
              <button type="button" onClick={onAddNew} className="mt-3 inline-flex min-h-12 items-center rounded-xl bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] px-5 text-sm font-bold text-[#41362D]">
                {t("addressPickerModal.addAddressLink")}
              </button>
            </div>
          ) : (
            addresses.map((addr) => {
              const isSelected = selectedId === addr.id;
              return (
                <button
                  type="button"
                  key={addr.id}
                  aria-pressed={isSelected}
                  onClick={() => { onSelect(addr.id); onClose(); }}
                  className={`w-full text-left rounded-2xl border-2 bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] overflow-hidden transition-all ${isSelected ? "border-[#F7EDE2] ring-4 ring-[#F7EDE2]/40" : "border-[#41362D]/30"}`}
                >
                  <div className="px-4 py-2 flex items-center justify-between border-b border-[#41362D]/10">
                    <div className="flex items-center gap-2">
                      {addr.label && <span className="font-bold text-sm text-[#41362D]">{addr.label}</span>}
                      {addr.isDefault && <span className="bg-gradient-to-br from-[#41362D] to-[#6B594A] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{t("addressPickerModal.defaultBadge")}</span>}
                    </div>
                    {isSelected && <span className="flex items-center gap-1 text-sm font-bold text-[#41362D]"><Check className="w-4 h-4" aria-hidden="true" />{tf("address.selected")}</span>}
                  </div>
                  <div className="px-4 py-3 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <MapPin aria-hidden="true" className="w-4 h-4 text-[#41362D] flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 text-sm text-[#41362D]">
                        <p className="font-bold">{addr.name || t("addressPickerModal.deliveryContactFallback")}</p>
                        {addr.phone && <p>{addr.phone}</p>}
                        <p className="break-words">{[addr.street, addr.city, addr.state, addr.postcode, addr.country].filter(Boolean).join(", ")}</p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
        {addresses.length > 0 && (
          <div className="flex-shrink-0 border-t border-[#F7EDE2]/25 px-4 pt-3">
            <button
              type="button"
              onClick={onAddNew}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#41362D] bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] py-3 text-sm font-semibold text-[#41362D] transition-transform active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> {t("addressPickerModal.addNewAddress")}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
