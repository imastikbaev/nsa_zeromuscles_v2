import { catalog } from "./catalog";
export type Locale = "en" | "ru" | "kk";
export type Theme = "dark" | "light";
export const PREFERENCES_KEY = "mission-architect:preferences:v1";
export const localeTags: Record<Locale, string> = {
  en: "en-US",
  ru: "ru-RU",
  kk: "kk-KZ",
};
export function validPreferences(
  value: unknown,
): value is { locale: Locale; theme: Theme } {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.locale === "string" &&
    ["en", "ru", "kk"].includes(p.locale) &&
    typeof p.theme === "string" &&
    ["light", "dark"].includes(p.theme)
  );
}
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = Object.entries(catalog)
  .filter(([key]) => /\{\d+\}/.test(key))
  .map(([key, pair]) => ({
    regex: new RegExp(
      "^" +
        key
          .split(/\{\d+\}/)
          .map(escape)
          .join("(.+?)") +
        "$",
    ),
    pair,
  }));
/** Source-copy keys keep the engineering catalog and serialized designs language independent.
 * Translation happens only at explicit UI boundaries, never by mutating the DOM or design data. */
export function translate(source: string, locale: Locale): string {
  if (locale === "en" || !source.trim()) return source;
  const key = source.replace(/\s+/g, " ").trim();
  const index = locale === "ru" ? 0 : 1;
  const exact = catalog[key];
  if (exact) return source.replace(source.trim(), exact[index]);
  for (const { regex, pair } of patterns) {
    const match = key.match(regex);
    if (match)
      return pair[index].replace(/\{(\d+)\}/g, (_, n) =>
        translate(match[Number(n) + 1], locale),
      );
  }
  // Compound labels, reports and telemetry use independently translated clauses.
  for (const separator of ["\n", " · ", ": ", " / ", " + "]) {
    if (source.includes(separator))
      return source
        .split(separator)
        .map((s) => translate(s, locale))
        .join(separator);
  }
  return source;
}
export function preferredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const p = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "null");
    return validPreferences(p) ? p.locale : "ru";
  } catch {
    return "ru";
  }
}
