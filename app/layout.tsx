import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "PREUVIA DUERP", template: "%s | PREUVIA DUERP" },
  description: "Plateforme SaaS de gestion HSE, DUERP, Formation professionnelle et conformité réglementaire",
  keywords: ["HSE", "DUERP", "Qualiopi", "ISO 9001", "HACCP", "formation professionnelle", "RGPD", "conformité"],
  authors: [{ name: "PREUVIA DUERP" }],
  creator: "PREUVIA DUERP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
