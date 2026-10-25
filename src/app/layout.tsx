import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description = "Pilot, entrepreneur, and builder. Personal site of London Zade.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.londonzade.com"),
  title: "London Zade",
  description,
  openGraph: {
    title: "London Zade",
    description,
    url: "/",
    siteName: "London Zade",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "London Zade",
    description,
  },
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
