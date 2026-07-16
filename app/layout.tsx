import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "PREUVIA DUERP", template: "%s | PREUVIA DUERP" },
  description: "Plateforme SaaS de gestion HSE, DUERP, Formation professionnelle et conformité réglementaire",
  keywords: ["HSE", "DUERP", "Qualiopi", "ISO 9001", "HACCP", "formation professionnelle", "RGPD", "conformité"],
  authors: [{ name: "PREUVIA DUERP" }],
  creator: "PREUVIA DUERP",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lire le nonce CSP posé par middleware.ts (en-tête `x-nonce`) : cet appel
  // à `headers()` force le rendu dynamique de ce layout et permet à Next.js
  // d'appliquer automatiquement ce nonce à ses propres scripts inline de
  // streaming/hydratation, conformément au Content-Security-Policy strict
  // (`script-src 'nonce-...' 'strict-dynamic'`) posé par le middleware.
  await headers();

  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
