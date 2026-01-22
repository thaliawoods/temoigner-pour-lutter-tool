import "./globals.css";
import { nimbusRoman, nimbusSans } from "@/lib/fonts";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${nimbusRoman.variable} ${nimbusSans.variable}`}>
      <body className="min-h-screen bg-white text-zinc-900">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
