import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { pageMetadata, SITE_DESCRIPTION, SITE_NAME } from "@/lib/metadata";
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
  metadataBase: new URL("https://www.londonzade.com"),
  ...pageMetadata({ title: SITE_NAME, description: SITE_DESCRIPTION, path: "/" }),
  applicationName: SITE_NAME,
  appleWebApp: { title: SITE_NAME },
};

export const viewport: Viewport = {
  themeColor: "#121314",
  colorScheme: "dark",
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
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
