import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./mission-theme.css";
import "./preferences.css";
import "./aerospace.css";
import "./workbench.css";
import { PreferencesProvider } from "@/components/preferences";
export const metadata: Metadata = {
  title: "Mission Architect — Space Mission Design Lab",
  description:
    "Your mission. Your decisions. Design a spacecraft, balance the engineering, and explore the unknown in an interactive space mission simulator.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mission Architect",
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
    <html lang="en">
      <body>
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
