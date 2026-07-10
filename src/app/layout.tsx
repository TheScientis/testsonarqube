import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DataSaverProvider } from "@/context/DataSaverContext";
import { AuthGuardProvider } from "@/context/AuthGuardContext";
import { ModalProvider } from "@/context/ModalContext";
import DataSaverBanner from "@/components/DataSaverBanner";
import SyncDrafts from "@/components/SyncDrafts";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "WIWOKDETOK — Ubah Janji Jadi Aksi",
  description:
    "Tracking political promises against environmental realities. See the gap between what is said and what is done in real-time.",
};

import { I18nProvider } from "@/context/I18nContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Preconnect so icon font and Inter (if any) start loading earlier */}
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link href="https://fonts.gstatic.com" rel="preconnect" crossOrigin="" />
        {/* Preload Material Symbols so icons don’t flash as text/boxes */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen bg-white text-slate-900 font-sans flex flex-col antialiased">
        <I18nProvider>
          <DataSaverProvider>
            <AuthGuardProvider>
              <ModalProvider>
                <DataSaverBanner />
                <SyncDrafts />
                {children}
              </ModalProvider>
            </AuthGuardProvider>
          </DataSaverProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
