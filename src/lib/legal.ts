import type { Lang } from "@/lib/i18n";

export const TERMS_CLAUSES = {
  en: [
    "By submitting this listing I confirm that I am the owner or an authorised representative of the business.",
    "I consent to the publication of the information I submit, and of a public change history of that information, on this website and through any public API operated from it.",
    "I understand that anyone (including search engines, archives, and other organisations) may access, copy, and republish that public information.",
    "If I later remove the listing on this website, the operators will stop displaying it here; copies held by others remain with those others.",
    "I understand that administrators may remove any listing at any time, with or without reason, and without liability.",
    "I confirm that the business is at least 51% owned by a Muslim and is registered in Singapore with a UEN.",
    "I am responsible for the accuracy of this listing.",
  ],
  ms: [
    "Dengan menghantar senarai ini, saya mengesahkan bahawa saya ialah pemilik atau wakil yang diberi kuasa bagi perniagaan ini.",
    "Saya bersetuju maklumat yang saya hantar, termasuk sejarah perubahan awam, diterbitkan di laman ini dan melalui mana-mana API awam yang dikendalikan daripadanya.",
    "Saya faham sesiapa (termasuk enjin carian, arkib, dan organisasi lain) boleh mengakses, menyalin, dan menerbitkan semula maklumat awam itu.",
    "Jika saya kemudian membuang senarai di laman ini, pengendali akan berhenti memaparkannya di sini; salinan yang dipegang orang lain kekal dengan mereka.",
    "Saya faham pentadbir boleh membuang mana-mana senarai pada bila-bila masa, dengan atau tanpa sebab, dan tanpa liabiliti.",
    "Saya mengesahkan bahawa perniagaan ini dimiliki sekurang-kurangnya 51% oleh seorang Muslim dan berdaftar di Singapura dengan UEN.",
    "Saya bertanggungjawab terhadap ketepatan senarai ini.",
  ],
  zh: [
    "提交本商家页即表示我确认本人是该商家的业主或获授权代表。",
    "我同意将我所提交的资料，以及该资料的公开变更记录，在本网站及其营运的任何公开 API 上发布。",
    "我明白任何人（包括搜索引擎、档案库和其他机构）都可以访问、复制并再次发布这些公开资料。",
    "若我日后在本网站移除商家页，营运方将停止在此显示；他人持有的副本仍归他人所有。",
    "我明白管理员可随时移除任何商家页，无论有无理由，且不承担法律责任。",
    "我确认该商家至少 51% 由穆斯林拥有，并在新加坡以 UEN 注册。",
    "本人对本商家页的准确性负责。",
  ],
  ta: [
    "இந்தப் பட்டியலைச் சமர்ப்பிப்பதன் மூலம், நான் வணிகத்தின் உரிமையாளர் அல்லது அங்கீகரிக்கப்பட்ட பிரதிநிதி என்று உறுதி செய்கிறேன்.",
    "நான் சமர்ப்பிக்கும் தகவலையும், அந்தத் தகவலின் பொது மாற்ற வரலாற்றையும் இந்த வலைத்தளத்திலும் அதிலிருந்து இயக்கப்படும் எந்தப் பொது APIயிலும் வெளியிட நான் ஒப்புக்கொள்கிறேன்.",
    "யார் வேண்டுமானாலும் (தேடுபொறிகள், காப்பகங்கள், பிற அமைப்புகள் உட்பட) அந்தப் பொதுத் தகவலை அணுகலாம், நகலெடுக்கலாம், மீண்டும் வெளியிடலாம் என்பதை நான் புரிந்துகொள்கிறேன்.",
    "பின்னர் இந்த வலைத்தளத்தில் பட்டியலை அகற்றினால், இயக்குநர்கள் இங்கே காட்டுவதை நிறுத்துவார்கள்; பிறர் வைத்திருக்கும் நகல்கள் அவர்களிடமே இருக்கும்.",
    "நிர்வாகிகள் எந்த நேரத்திலும், காரணத்துடன் அல்லது இல்லாமல், பொறுப்பின்றி எந்தப் பட்டியலையும் அகற்றலாம் என்பதை நான் புரிந்துகொள்கிறேன்.",
    "வணிகம் குறைந்தது 51% முஸ்லிம் உரிமையிலானது மற்றும் UEN உடன் சிங்கப்பூரில் பதிவு செய்யப்பட்டது என்று நான் உறுதி செய்கிறேன்.",
    "இந்தப் பட்டியலின் துல்லியத்திற்கு நான் பொறுப்பு.",
  ],
} as const;

export const TERMS_CLAUSE_COUNT = TERMS_CLAUSES.en.length;

export const TERMS_COPY = TERMS_CLAUSES.en.join(" ");
export const TERMS_COPY_MS = TERMS_CLAUSES.ms.join(" ");
export const TERMS_COPY_ZH = TERMS_CLAUSES.zh.join(" ");
export const TERMS_COPY_TA = TERMS_CLAUSES.ta.join(" ");

export function termsClauses(lang: Lang): readonly string[] {
  return TERMS_CLAUSES[lang];
}

export function termsCopy(lang: Lang) {
  return termsClauses(lang).join(" ");
}

/** The on-screen agreement that was ticked is stored as the contract text. */
export function acceptedTermsCopy(submitted?: string | null) {
  const text = submitted?.replace(/\r\n/g, "\n").trim() || "";
  const known = [
    TERMS_COPY,
    TERMS_COPY_MS,
    TERMS_COPY_ZH,
    TERMS_COPY_TA,
    TERMS_CLAUSES.en.join("\n"),
    TERMS_CLAUSES.ms.join("\n"),
    TERMS_CLAUSES.zh.join("\n"),
    TERMS_CLAUSES.ta.join("\n"),
  ];
  const match = known.find((item) => item.trim() === text);
  return match || TERMS_COPY;
}

export async function localizedTerms(lang: Lang) {
  return termsCopy(lang);
}

/** Matches the footer image alt text. */
export const DISCLAIMER_SENTENCE =
  "We are not associated with any other Muslim-owned enterprise websites or organisation.";
