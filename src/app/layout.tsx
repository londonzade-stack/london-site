import type { Metadata } from "next";
import { Geist, Geist_Mono, Chakra_Petch } from "next/font/google";
import { Nav } from "@/components/nav";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "London Zade",
  description:
    "Pilot, entrepreneur, and builder. Personal site of London Zade.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${chakraPetch.variable} antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="mx-auto max-w-2xl px-6 py-10 sm:py-16">
            <Nav />
            <main>{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
