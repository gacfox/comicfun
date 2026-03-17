import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { enUS } from "@/i18n/locales/en-US";
import { zhCN } from "@/i18n/locales/zh-CN";

const resources = {
  "en-US": { translation: enUS },
  "zh-CN": { translation: zhCN },
};

function getBrowserLanguage(): string {
  const browserLang = navigator.language;
  if (browserLang.startsWith("zh")) {
    return "zh-CN";
  }
  return "en-US";
}

function getSavedLanguage(): string {
  try {
    const stored = localStorage.getItem("language-storage");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.language) {
        return parsed.state.language;
      }
    }
  } catch {}
  return getBrowserLanguage();
}

const savedLanguage = getSavedLanguage();

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: "zh-CN",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
