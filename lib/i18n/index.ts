import { catalog } from "./catalog";
import russian from "./ru.json";
const ruCatalog: Record<string, string> = russian;
export type Locale = "en" | "ru" | "kk";
export type Theme = "dark" | "light";
export const PREFERENCES_KEY = "mission-architect:preferences:v2";
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
const combinedCatalog: Record<string, readonly [string, string]> = { ...catalog };
for (const [key, value] of Object.entries(ruCatalog)) combinedCatalog[key] = [value, catalog[key]?.[1] ?? key];
const patterns = Object.entries(combinedCatalog)
  .filter(([key]) => /\{\d+\}/.test(key))
  .map(([key, pair]) => ({
    regex: new RegExp(
      "^" +
        key.split(/\{\d+\}/).map((literal, i, parts) => {
          if (i === parts.length - 1) return escape(literal);
          const next = parts[i + 1];
          const numeric = /^\s*(?:kg\b|W\b|GB\b|Mbps\b|kWh\b|m²|km\b|AU\b|yr\b|min\b|m\/s|%)/.test(next);
          return escape(literal) + (numeric ? "([+−\\-\\d.,]+)" : "(.+?)");
        }).join("") +
        "$",
    ),
    pair,
  }));
/** Source-copy keys keep the engineering catalog and serialized designs language independent.
 * Translation happens only at explicit UI boundaries, never by mutating the DOM or design data. */
export function translate(source: string, locale: Locale): string {
  if (locale === "en" || !source.trim()) return source;
  if (source.includes("\n")) return source.split("\n").map(line => translate(line, locale)).join("\n");
  const key = source.replace(/\s+/g, " ").trim();
  const index = locale === "ru" ? 0 : 1;
  const exact = combinedCatalog[key];
  if (exact) return source.replace(source.trim(), exact[index]);
  for (const { regex, pair } of patterns) {
    const match = key.match(regex);
    if (match)
      return pair[index].replace(/\{(\d+)\}/g, (_, n) =>
        translate(match[Number(n) + 1], locale),
      );
  }
  // Compound labels, reports and telemetry use independently translated clauses.
  for (const separator of [" · ", ": ", " / ", " + ", " | ", ", ", "; "]) {
    if (source.includes(separator))
      return source
        .split(separator)
        .map((s) => translate(s, locale))
        .join(separator);
  }
  return source;
}
export function preferredLocale(): Locale {
  if (typeof window === "undefined") return "ru";
  try {
    const p = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "null");
    return validPreferences(p) ? p.locale : "ru";
  } catch {
    return "ru";
  }
}
