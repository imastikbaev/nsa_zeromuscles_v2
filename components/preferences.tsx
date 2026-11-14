"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Moon, Sun } from "lucide-react";
import {
  Locale,
  Theme,
  translate,
  validPreferences,
  PREFERENCES_KEY,
  localeTags,
} from "@/lib/i18n";
type Preferences = {
  locale: Locale;
  theme: Theme;
  setLocale: (v: Locale) => void;
  setTheme: (v: Theme) => void;
  saved: boolean;
};
const Context = createContext<Preferences | null>(null);
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [theme, setTheme] = useState<Theme>("dark");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "null");
      if (validPreferences(p)) {
        setLocale(p.locale);
        setTheme(p.theme);
      } else {
        setLocale("ru");
      }
    } catch {
      setLocale("ru");
      setSaved(false);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#05080f" : "#f3f5f8");
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ locale, theme }));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [locale, theme, ready]);
  const value = useMemo(
    () => ({ locale, theme, setLocale, setTheme, saved }),
    [locale, theme, saved],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useI18n() {
  const context = useContext(Context);
  if (!context) throw new Error("Missing PreferencesProvider");
  const t = useCallback(
    (text: string | undefined) => translate(text ?? "", context.locale),
    [context.locale],
  );
  const tx = useCallback(
    (node: ReactNode): ReactNode => (typeof node === "string" ? t(node) : node),
    [t],
  );
  const number = useCallback(
    (n: number, digits = 0) =>
      new Intl.NumberFormat(localeTags[context.locale], {
        maximumFractionDigits: digits,
      }).format(n),
    [context.locale],
  );
  return { ...context, t, tx, number, localeTag: localeTags[context.locale] };
}
export function PreferenceControls() {
  const { locale, setLocale, theme, setTheme, t, saved } = useI18n();
  return (
    <div className="preference-controls">
      <label className="language-control">
        <span className="sr-only">{t("Interface language")}</span>
        <select
          aria-label={t("Interface language")}
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
        >
          <option lang="ru" value="ru">
            Русский
          </option>
          <option lang="kk" value="kk">
            Қазақша
          </option>
          <option lang="en" value="en">
            English
          </option>
        </select>
      </label>
      <button
        className="theme-control"
        aria-label={t(
          theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        )}
        title={t(
          theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        )}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      {!saved && (
        <span role="status" className="preference-warning">
          {t("Preferences apply for this visit only.")}
        </span>
      )}
    </div>
  );
}
