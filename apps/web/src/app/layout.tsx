import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { I18nProvider } from "@/i18n/i18n-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Perlerloom",
  description: "Generate and edit crisp bead patterns from uploaded images.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full min-h-0 antialiased`}
    >
      <body className="flex h-dvh min-h-0 flex-col overflow-hidden">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
