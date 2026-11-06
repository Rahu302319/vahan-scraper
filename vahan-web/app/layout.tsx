import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

export const viewport: Viewport = {
  themeColor: "#080d1a",
};

export const metadata: Metadata = {
  title: "Vahan 4 Dashboard — Kerala 87 RTO Data Scraper",
  description: "Automated batch extraction and analytics for all 87 Kerala RTO transport offices",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vahan 4",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#080d1a] text-[#f8fafc] antialiased">
        {children}
        <PWAInstallPrompt />
      </body>
    </html>
  );
}

