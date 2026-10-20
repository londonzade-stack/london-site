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
  themeColor: "#050506",
  colorScheme: "dark",
};

/**
 * Runs before first paint. Flags WebGL2-capable browsers so the glass home can
 * hold a dark stage instead of flashing the fallback layout. If the app never
 * boots (a JS chunk fails to load), the flag is dropped after 6s so the
 * fallback layout appears instead of an endless loading stage.
 */
const glassCapabilityScript = `try{if(window.WebGL2RenderingContext){var d=document.documentElement;d.dataset.glass="3d";setTimeout(function(){var r=document.querySelector(".glass-home");if(r&&!r.dataset.mode&&!window.__glassBoot)d.dataset.glass="off"},6000)}}catch(e){}`;

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
      <head>
        <script dangerouslySetInnerHTML={{ __html: glassCapabilityScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
