"use client";
import { useI18n } from "./preferences";
import { useEffect, useState } from "react";
import { Download, RefreshCw, WifiOff, X } from "lucide-react";
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export function InstallControl() {
  const { t, tx, localeTag } = useI18n();

  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [offline, setOffline] = useState(false);
  const [help, setHelp] = useState(false);
  const [update, setUpdate] = useState<ServiceWorker | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  useEffect(() => {
    setStandalone(window.matchMedia("(display-mode: standalone)").matches);
    setOffline(!navigator.onLine);
    const install = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const installed = () => {
      setStandalone(true);
      setPrompt(null);
    };
    const online = () => setOffline(false),
      off = () => setOffline(true);
    window.addEventListener("beforeinstallprompt", install);
    window.addEventListener("appinstalled", installed);
    window.addEventListener("online", online);
    window.addEventListener("offline", off);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          if (reg.active) setOfflineReady(true);
          if (reg.waiting) setUpdate(reg.waiting);
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing;
            worker?.addEventListener("statechange", () => {
              if (worker.state === "installed") {
                setOfflineReady(true);
                if (navigator.serviceWorker.controller) setUpdate(worker);
              }
            });
          });
        })
        .catch(() => setOfflineReady(false));
    return () => {
      window.removeEventListener("beforeinstallprompt", install);
      window.removeEventListener("appinstalled", installed);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", off);
    };
  }, []);
  async function install() {
    if (prompt) {
      await prompt.prompt();
      const c = await prompt.userChoice;
      if (c.outcome === "accepted") setPrompt(null);
    } else setHelp((v) => !v);
  }
  return (
    <div className="install-control">
      {tx(
        offline && (
          <span className="offline-indicator">
            <WifiOff size={13} /> {t(" Offline")}
          </span>
        ),
      )}
      {tx(
        update ? (
          <button
            className="install-button"
            onClick={() => {
              navigator.serviceWorker.addEventListener(
                "controllerchange",
                () => window.location.reload(),
                { once: true },
              );
              update.postMessage({ type: "SKIP_WAITING" });
            }}
          >
            <RefreshCw size={13} /> {t(" Update app")}
          </button>
        ) : (
          !standalone && (
            <button className="install-button" onClick={install}>
              <Download size={13} /> {t(" Install app")}
            </button>
          )
        ),
      )}
      {tx(
        help && (
          <div className="install-help">
            <div className="sub-heading">
              <h3>{t("Take Mission Architect with you.")}</h3>
              <button
                aria-label={t("Close installation help")}
                onClick={() => setHelp(false)}
              >
                <X size={15} />
              </button>
            </div>
            <p>
              {t("In Chrome or Edge, use ")}
              <strong>{t("Install app")}</strong>{" "}
              {t(" in the address bar or browser menu.")}
            </p>
            <p>
              {t("On iPhone or iPad, open in Safari and choose")}
              {tx(" ")}
              <strong>{t("Share → Add to Home Screen")}</strong>
              {t(". On Mac Safari, choose")}
              {tx(" ")}
              <strong>{t("File → Add to Dock")}</strong>
              {t(".")}
            </p>
            <span>
              {tx(
                offlineReady
                  ? "✓ Offline files are ready on this device."
                  : process.env.NODE_ENV === "production"
                    ? "Open this app online once to prepare offline files."
                    : "Offline installation is available in the production build.",
              )}
            </span>
          </div>
        ),
      )}
    </div>
  );
}
