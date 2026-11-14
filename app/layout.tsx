import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./mission-theme.css";
import "./preferences.css";
import "./aerospace.css";
import "./workbench.css";
import { PreferencesProvider } from "@/components/preferences";
export const metadata: Metadata = {
  title: "Архитектор миссий — лаборатория космического проектирования",
  description:
    "Ваша миссия. Ваши решения. Создайте аппарат, сбалансируйте ресурсы и исследуйте космос в интерактивном симуляторе.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Архитектор миссий",
  },
  icons: { icon: "/favicon.svg", apple: "/icon-192.png" },
};
export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
