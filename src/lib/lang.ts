import { cookies } from "next/headers";
import { copy, isLang, LANG_COOKIE, type Lang, type Messages } from "@/lib/i18n";

export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(value) ? value : "en";
}

export async function getCopy(): Promise<{ lang: Lang; t: Messages }> {
  const lang = await getLang();
  return { lang, t: copy(lang) };
}
