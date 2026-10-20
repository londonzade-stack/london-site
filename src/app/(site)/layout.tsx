import { Nav } from "@/components/nav";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="site-shell">
      <Nav />
      <main className="site-main">{children}</main>
      <footer className="site-foot">&copy; {new Date().getFullYear()} London Zade</footer>
    </div>
  );
}
