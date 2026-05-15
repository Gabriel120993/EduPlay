import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import es from "./locales/es.json";

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? "es";

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: deviceLocale.startsWith("es") ? "es" : "en",
  fallbackLng: "es",
  interpolation: { escapeValue: false },
});

export default i18n;
