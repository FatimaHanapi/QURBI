import React, { useState, useEffect } from "react";
import { qurbiApi } from "@/api/qurbiClient";
import { Plus, Pencil, Trash2, Eye, EyeOff, Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useReveal } from "@/hooks/useReveal";
import AppHeader from "@/components/AppHeader";
import { QurbiCardSkeleton } from "@/components/QurbiLoading";
import { QurbiPageLoader } from "@/components/QurbiLoading";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";

const GRADES = ["AA", "A", "B", "C", "D"];
const GRADE_KEYS = {
  AA: "aa_price",
  A: "a_price",
  B: "b_price",
  C: "c_price",
  D: "d_price",
};
const EMPTY_FORM = {
  breed_name: "",
  livestock_category_id: "",
  origin: "",
  image_url: "",
  status: "active",
  age_range: "",
  gender: "Mixed",
  aa_price: "",
  a_price: "",
  b_price: "",
  c_price: "",
  d_price: "",
};

function BreedForm({ initial, categories, onSave, onCancel }) {
  const { t } = useTranslation("admin");
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.breed_name || !form.livestock_category_id) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3"
    >
      <h3 className="text-gray-900 font-bold text-base">
        {initial?.id
          ? t("adminBreeds.form.editTitle")
          : t("adminBreeds.form.addTitle")}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-gray-500 text-xs font-semibold block mb-1">
            {t("adminBreeds.form.nameLabel")}
          </label>
          <input
            value={form.breed_name}
            onChange={(e) => set("breed_name", e.target.value)}
            required
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-[#A9825F]"
            placeholder={t("adminBreeds.form.namePlaceholder")}
          />
        </div>
        <div>
          <label className="text-gray-500 text-xs font-semibold block mb-1">
            {t("adminBreeds.form.categoryLabel")}
          </label>
          <select
            value={form.livestock_category_id}
            onChange={(e) => set("livestock_category_id", e.target.value)}
            required
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-[#A9825F]"
          >
            <option value="">{t("adminBreeds.form.categoryPlaceholder")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-gray-500 text-xs font-semibold block mb-1">
          {t("adminBreeds.form.originLabel")}
        </label>
        <input
          value={form.origin}
          onChange={(e) => set("origin", e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-[#A9825F]"
          placeholder={t("adminBreeds.form.originPlaceholder")}
        />
      </div>

      <div>
        <label className="text-gray-500 text-xs font-semibold block mb-1">
          {t("adminBreeds.form.imageUrlLabel")}
        </label>
        <input
          value={form.image_url}
          onChange={(e) => set("image_url", e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-[#A9825F]"
          placeholder="https://..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-gray-500 text-xs font-semibold block mb-1">
            {t("adminBreeds.form.ageRangeLabel")}
          </label>
          <input
            value={form.age_range}
            onChange={(e) => set("age_range", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-[#A9825F]"
            placeholder={t("adminBreeds.form.ageRangePlaceholder")}
          />
        </div>
        <div>
          <label className="text-gray-500 text-xs font-semibold block mb-1">
            {t("adminBreeds.form.genderLabel")}
          </label>
          <select
            value={form.gender}
            onChange={(e) => set("gender", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-[#A9825F]"
          >
            <option value="Male">{t("adminBreeds.form.genderMale")}</option>
            <option value="Female">{t("adminBreeds.form.genderFemale")}</option>
            <option value="Mixed">{t("adminBreeds.form.genderMixed")}</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-gray-500 text-xs font-semibold block mb-2">
          {t("adminBreeds.form.priceByGradeLabel")}
        </label>
        <div className="grid grid-cols-5 gap-2">
          {GRADES.map((g) => (
            <div key={g}>
              <label className="text-gray-400 text-xs font-bold block mb-1 text-center">
                {t("adminBreeds.form.gradeLabel", { grade: g })}
              </label>
              <input
                type="number"
                value={form[GRADE_KEYS[g]]}
                onChange={(e) =>
                  set(
                    GRADE_KEYS[g],
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#A9825F] text-center"
                placeholder="0"
                min="0"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="status"
          checked={form.status === "active"}
          onChange={(e) =>
            set("status", e.target.checked ? "active" : "inactive")
          }
          className="w-4 h-4 accent-[#F7EDE2]0"
        />
        <label htmlFor="status" className="text-gray-600 text-sm">
          {t("adminBreeds.form.activeLabel")}
        </label>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-[#F7EDE2]0 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Check className="w-4 h-4" />{" "}
          {saving ? t("adminBreeds.form.saving") : t("adminBreeds.form.save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-500 text-sm font-semibold"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}

function BreedRow({ breed, categoryMap, onEdit, onDelete, onToggle }) {
  const { t } = useTranslation("admin");
  const cat = categoryMap[breed.livestock_category_id] || {};
  const isActive = breed.status === "active";

  return (
    <div
      className={`bg-white rounded-2xl p-4 shadow-sm border flex items-center gap-3 ${isActive ? "border-gray-100" : "border-gray-100 opacity-60"}`}
    >
      {breed.image_url ? (
        <img
          src={breed.image_url}
          alt={breed.breed_name}
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-gray-100"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
          {cat.icon || "🐾"}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-900 font-bold text-sm">
            {breed.breed_name}
          </span>
          <span className="text-gray-400 text-xs">
            {cat.icon} {cat.name}
          </span>
          {!isActive && (
            <span className="bg-gray-100 text-gray-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {t("adminBreeds.row.hidden")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {breed.origin && (
            <span className="text-gray-400 text-xs">🌍 {breed.origin}</span>
          )}
          {breed.age_range && (
            <span className="text-gray-400 text-xs">🎂 {breed.age_range}</span>
          )}
          {breed.gender && (
            <span className="bg-gray-100 text-gray-500 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {breed.gender}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onToggle(breed)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? "bg-[#F7EDE2] text-[#F7EDE2]0" : "bg-gray-100 text-gray-400"}`}
        >
          {isActive ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={() => onEdit(breed)}
          className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(breed)}
          className="w-8 h-8 bg-red-50 text-red-400 rounded-lg flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function AdminBreeds() {
  const { t } = useTranslation("admin");
  const { user, authChecked } = useAuth();
  const [categories, setCategories] = useState([]);
  const [breeds, setBreeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterCategoryId, setFilterCategoryId] = useState("All");
  const { reveal } = useReveal();

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  const loadAll = () => {
    if (user?.role !== "admin") {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      qurbiApi.entities.LivestockCategory.list(),
      qurbiApi.entities.Breed.list(),
    ])
      .then(([cats, breds]) => {
        setCategories(cats);
        setBreeds(breds);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, [authChecked, user?.role]);

  const handleSave = async (form) => {
    if (editing?.id) {
      await qurbiApi.entities.Breed.update(editing.id, form);
    } else {
      await qurbiApi.entities.Breed.create(form);
    }
    setShowForm(false);
    setEditing(null);
    loadAll();
  };

  const handleEdit = (breed) => {
    setEditing(breed);
    setShowForm(true);
  };
  const handleCancel = () => {
    setEditing(null);
    setShowForm(false);
  };

  const handleDelete = async (breed) => {
    if (
      !confirm(
        t("adminBreeds.confirmDelete", { name: breed.breed_name }),
      )
    )
      return;
    await qurbiApi.entities.Breed.delete(breed.id);
    loadAll();
  };

  const handleToggle = async (breed) => {
    await qurbiApi.entities.Breed.update(breed.id, {
      status: breed.status === "active" ? "inactive" : "active",
    });
    loadAll();
  };

  const filtered =
    filterCategoryId === "All"
      ? breeds
      : breeds.filter((b) => b.livestock_category_id === filterCategoryId);

  if (!authChecked || loading) return <QurbiPageLoader label={t("adminBreeds.loading")} />;

  if (user?.role !== "admin") {
    return (
      <main className="aisyah-page flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="font-semibold text-[#41362D]/65">{t("adminBreeds.adminRequired")}</p>
        <Link to="/" className="font-bold text-[#6B594A]">{t("adminBreeds.backToHome")}</Link>
      </main>
    );
  }

  return (
    <div className="aisyah-page">
      <AppHeader
        title={t("adminBreeds.title")}
        subtitle={t("adminBreeds.subtitle", { count: breeds.length })}
      />
      <div className={`px-5 pt-5 ${reveal()}`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#6B594A]">
            {t("adminBreeds.manageSubtitle")}
          </p>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="bg-[#F7EDE2]0 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> {t("adminBreeds.add")}
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {showForm && (
          <div className={reveal()} style={{ animationDelay: "80ms" }}>
            <BreedForm
              initial={editing}
              categories={categories}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        )}

        <div
          className={`flex gap-2 overflow-x-auto no-scrollbar pb-1 ${reveal()}`}
          style={{ animationDelay: "140ms" }}
        >
          <button
            onClick={() => setFilterCategoryId("All")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterCategoryId === "All" ? "bg-[#F7EDE2]0 text-white" : "bg-white text-gray-500 border border-gray-100"}`}
          >
            {t("adminBreeds.filterAll")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategoryId(cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterCategoryId === cat.id ? "bg-[#F7EDE2]0 text-white" : "bg-white text-gray-500 border border-gray-100"}`} 
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {loading ? (
          <QurbiCardSkeleton count={4} variant="list" />
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-16">
            {t("adminBreeds.noBreedsFound")}
          </p>
        ) : (
          filtered.map((breed, idx) => (
            <div
              key={breed.id}
              className={reveal()}
              style={{ animationDelay: `${Math.min(200 + idx * 50, 500)}ms` }}
            >
              <BreedRow
                breed={breed}
                categoryMap={categoryMap}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
