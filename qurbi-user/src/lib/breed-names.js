import { useEffect, useState } from "react";
import { qurbiApi } from "@/api/qurbiClient";
import { getBreedGenderBreakdown } from "@/lib/bulk-listing";

/** @type {Promise<Record<string, string>> | null} */
let breedNamesPromise = null;

/** Loads breed id -> name once per session (public GET /breeds). */
function loadBreedNames() {
  if (!breedNamesPromise) {
    breedNamesPromise = qurbiApi.entities.Breed.list()
      .then((response) => {
        const rows = Array.isArray(response) ? response : response?.data || [];
        return Object.fromEntries(rows.filter((row) => row?.id).map((row) => [row.id, row.name]));
      })
      .catch(() => {
        breedNamesPromise = null;
        return {};
      });
  }
  return breedNamesPromise;
}

const needsName = (entry) =>
  entry && typeof entry === "object" && (entry.breedId || entry.breed_id) && (!entry.breed || /^Breed \d+$/.test(entry.breed));

/**
 * Breed names for bulk-lot breakdown rows that only carry a breedId.
 * Only fetches when at least one listing actually needs it.
 * @param {any[]} listings
 */
export function useBreedNames(listings) {
  const needed = (listings || []).some((listing) => (listing?.breedBreakdown || []).some(needsName));
  const [names, setNames] = useState(/** @type {Record<string, string>} */ ({}));
  useEffect(() => {
    if (!needed) return undefined;
    let active = true;
    loadBreedNames().then((result) => {
      if (active) setNames(result);
    });
    return () => {
      active = false;
    };
  }, [needed]);
  return names;
}

/**
 * Breakdown rows with breed names resolved. When a lot has a single breed
 * group without its own gender split, the lot's male/female counts describe
 * that group, so they are used instead of "gender split unavailable".
 * @param {any} listing
 * @param {Record<string, string>} breedNames
 */
export function resolvedBreakdown(listing, breedNames = {}) {
  const entries = (listing?.breedBreakdown || []).map((entry) => {
    if (!needsName(entry)) return entry;
    const name = breedNames[entry.breedId || entry.breed_id];
    return name ? { ...entry, breed: name } : entry;
  });
  const rows = getBreedGenderBreakdown({ ...listing, breedBreakdown: entries });
  const male = Number(listing?.maleCount || 0);
  const female = Number(listing?.femaleCount || 0);
  if (rows.length === 1 && !rows[0].hasGenderSplit && (rows[0].total == null || rows[0].total === male + female)) {
    rows[0] = { ...rows[0], maleCount: male, femaleCount: female, total: male + female, hasGenderSplit: true };
  }
  return rows;
}
