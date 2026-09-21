"use client";

import { createContext, useContext, type ReactNode } from "react";
import { copy, type Lang, type Messages } from "@/lib/i18n";

const I18nContext = createContext<{ lang: Lang; t: Messages }>({
  lang: "en",
  t: copy("en"),
});

export function I18nProvider({
  lang,
  t,
  children,
}: {
  lang: Lang;
  t: Messages;
  children: ReactNode;
}) {
  return <I18nContext.Provider value={{ lang, t }}>{children}</I18nContext.Provider>;
}

export function useCopy() {
  return useContext(I18nContext);
}
