import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Every translation lives under src/i18n/locales/<lang>/<namespace>.json.
// Namespaces are discovered automatically from the filenames, so adding a
// new namespace file is enough — nothing here needs to change.
const enModules = import.meta.glob("./locales/en/*.json", { eager: true });
const msModules = import.meta.glob("./locales/ms/*.json", { eager: true });

const namespaceFromPath = (path) => path.match(/([^/]+)\.json$/)[1];

const buildResources = (modules) => {
  const resources = {};
  for (const path in modules) {
    resources[namespaceFromPath(path)] = modules[path].default ?? modules[path];
  }
  return resources;
};

export const STORAGE_KEY = "qurbi_lang";
export const SUPPORTED_LANGUAGES = ["en", "ms"];

const storedLanguage = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
})();

const enResources = buildResources(enModules);

i18n.use(initReactI18next).init({
  resources: {
    en: enResources,
    ms: buildResources(msModules),
  },
  lng: SUPPORTED_LANGUAGES.includes(storedLanguage) ? storedLanguage : "en",
  fallbackLng: "en",
  ns: Object.keys(enResources),
  defaultNS: "common",
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // Ignore storage failures (private browsing, quota, etc.) — the
    // session still gets the right language, it just won't persist.
  }
});

export default i18n;
