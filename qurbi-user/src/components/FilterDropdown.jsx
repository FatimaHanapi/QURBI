import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

// options: array of strings OR { value, label } objects
// value: currently selected value (string)
// onSelect: (value) => void
// allowEmpty: if true, shows an "All {title}" option that selects ""
export default function FilterDropdown({
  title,
  options,
  value,
  onSelect,
  allowEmpty = true,
}) {
  const { t } = useTranslation("shop");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const normalize = (opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt;

  const normalized = options.map(normalize);
  const isActive = !!value;
  const selectedLabel =
    normalized.find((o) => o.value === value)?.label ||
    (allowEmpty
      ? t("filterDropdown.allOption", { title })
      : normalized[0]?.label || "");

  return (
    <div>
      {title && (
        <h3 className="mb-1.5 text-sm font-bold text-[#41362D]">
          {title}
        </h3>
      )}
      <div className="relative" ref={ref}>
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={title ? `${title}: ${selectedLabel}` : undefined}
          className={`w-full min-h-12 flex items-center justify-between rounded-2xl border-2 border-[#41362D]/70 pl-3.5 pr-3 py-3 text-base font-medium transition-all duration-200 ${
            isActive
              ? "bg-[#E3C19F] text-[#41362D]"
              : "bg-[#E3C19F] text-black hover:border-[#41362D]"
          } ${open ? "border-[#41362D] ring-4 ring-[#E3C19F]/40" : ""}`}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown
            className={`w-4 h-4 flex-shrink-0 ml-2 transition-transform duration-300 ${open ? "rotate-180" : ""} ${
              isActive ? "text-[#41362D]" : "text-[#6B594A]"
            }`}
          />
        </button>

        {/* Panel */}
        <div
          className={`absolute top-full left-0 right-0 mt-1.5 z-50 origin-top transition-all duration-200 ease-out ${
            open
              ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
              : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
          }`}
        >
          <div role="listbox" className="max-h-64 overflow-y-auto rounded-2xl border border-[#41362D]/30 bg-[#F7EDE2] py-1 shadow-xl shadow-black/15">
            {allowEmpty && (
              <button
                type="button"
                role="option"
                aria-selected={!value}
                tabIndex={open ? 0 : -1}
                onClick={() => {
                  onSelect("");
                  setOpen(false);
                }}
                className={`w-full min-h-11 text-left px-3.5 py-2.5 text-base flex items-center justify-between transition-colors duration-150 ${
                  !value
                    ? "bg-[#E3C19F] text-[#41362D] font-bold"
                    : "text-[#41362D] hover:bg-[#E3C19F]/60"
                }`}
              >
                {t("filterDropdown.allOption", { title })}
                {!value && <Check className="w-4 h-4 flex-shrink-0" />}
              </button>
            )}
            {normalized.map((opt) => (
              <button
                type="button"
                role="option"
                aria-selected={value === opt.value}
                tabIndex={open ? 0 : -1}
                key={opt.value}
                onClick={() => {
                  onSelect(opt.value);
                  setOpen(false);
                }}
                className={`w-full min-h-11 text-left px-3.5 py-2.5 text-base flex items-center justify-between transition-colors duration-150 ${
                  value === opt.value
                    ? "bg-[#E3C19F] text-[#41362D] font-bold"
                    : "text-[#41362D] hover:bg-[#E3C19F]/60"
                }`}
              >
                {opt.label}
                {value === opt.value && (
                  <Check className="w-4 h-4 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
