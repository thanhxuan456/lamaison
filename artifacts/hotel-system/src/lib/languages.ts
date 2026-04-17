export type Language = "vi" | "en" | "zh" | "ko";

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "vi", label: "Tiếng Việt", flag: "VI" },
  { code: "en", label: "English",    flag: "EN" },
  { code: "zh", label: "中文",        flag: "ZH" },
  { code: "ko", label: "한국어",      flag: "KO" },
];
