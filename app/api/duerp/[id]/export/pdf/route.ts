import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { PREUVIA_DISCLAIMER } from "@/types";
import type { UserRole } from "@/types";

export const runtime = "nodejs";

const duerpForExport = {
  include: {
    organization: { select: { name: true, siret: true, address: true, city: true, postalCode: true } },
    workUnits: { select: { name: true } },
    risks: {
      include: { hazard: { select: { name: true, family: true } } },
      orderBy: { riskLevel: "desc" },
    },
  },
} satisfies Prisma.DUERPDefaultArgs;

type DuerpWithRelations = Prisma.DUERPGetPayload<typeof duerpForExport>;

/**
 * Export PDF du DUERP généré à la demande (jamais stocké — aucune
 * intégration S3/stockage de fichiers dans ce dépôt, voir docs/STATUS.md).
 * Contenu structuré à partir des données réelles du DUERP (aucune donnée
 * inventée), avec la mention légale obligatoire en pied de chaque page.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "duerp", "export");
  if (forbidden) return forbidden;

  const { id } = await params;

  const duerp = await db.dUERP.findFirst({
    where: { id, organizationId: orgId },
    ...duerpForExport,
  });

  if (!duerp) return NextResponse.json({ error: "DUERP introuvable" }, { status: 404 });

  const pdfBuffer = await renderDuerpPdf(duerp);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="DUERP_${duerp.year}_v${duerp.version}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

const RISK_LEVEL_LABELS: Record<string, string> = {
  NEGLIGIBLE: "Négligeable",
  LOW: "Faible",
  MEDIUM: "Moyen",
  HIGH: "Élevé",
  CRITICAL: "Critique",
};

function renderDuerpPdf(duerp: DuerpWithRelations): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).font("Helvetica-Bold").text("Document Unique d'Évaluation des Risques Professionnels (DUERP)", { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(11).font("Helvetica").fillColor("#444444");
    doc.text(`${duerp.organization.name}`);
    if (duerp.organization.siret) doc.text(`SIRET : ${duerp.organization.siret}`);
    const addressLine = [duerp.organization.address, duerp.organization.postalCode, duerp.organization.city].filter(Boolean).join(", ");
    if (addressLine) doc.text(addressLine);
    doc.moveDown(0.8);

    doc.fillColor("#000000").fontSize(12).font("Helvetica-Bold").text(`Année ${duerp.year} — Version ${duerp.version}`);
    doc.font("Helvetica").fontSize(10).fillColor("#444444");
    doc.text(`Statut : ${duerp.status}`);
    if (duerp.validatedAt) doc.text(`Validé le : ${new Date(duerp.validatedAt).toLocaleDateString("fr-FR")}`);
    if (duerp.nextReviewDate) doc.text(`Prochaine révision : ${new Date(duerp.nextReviewDate).toLocaleDateString("fr-FR")}`);
    doc.text(`Document généré le : ${new Date().toLocaleDateString("fr-FR")}`);
    doc.moveDown(1);

    if (duerp.workUnits.length > 0) {
      doc.fillColor("#000000").fontSize(12).font("Helvetica-Bold").text("Unités de travail concernées");
      doc.font("Helvetica").fontSize(10).fillColor("#333333");
      duerp.workUnits.forEach((wu) => doc.text(`• ${wu.name}`));
      doc.moveDown(0.8);
    }

    doc.fillColor("#000000").fontSize(12).font("Helvetica-Bold").text(`Risques recensés (${duerp.risks.length})`);
    doc.moveDown(0.3);

    if (duerp.risks.length === 0) {
      doc.font("Helvetica-Oblique").fontSize(10).fillColor("#666666").text("Aucun risque recensé pour cette version.");
    }

    duerp.risks.forEach((risk, index) => {
      if (doc.y > 680) doc.addPage();

      doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
      doc.text(`${index + 1}. ${risk.hazardDescription}`);
      doc.font("Helvetica").fontSize(9).fillColor("#444444");
      if (risk.hazard) doc.text(`Famille de danger : ${risk.hazard.family} — ${risk.hazard.name}`);
      doc.text(
        `Brut — Fréquence ${risk.grossFrequency} × Gravité ${risk.grossGravity} / Maîtrise ${risk.grossMastery} = ${risk.grossRisk}`
      );
      doc.text(
        `Résiduel — Fréquence ${risk.residualFrequency} × Gravité ${risk.residualGravity} / Maîtrise ${risk.residualMastery} = ${risk.residualRisk}`
      );
      doc.font("Helvetica-Bold").text(`Niveau de risque : ${RISK_LEVEL_LABELS[risk.riskLevel] ?? risk.riskLevel}`);
      if (risk.existingMeasures) {
        doc.font("Helvetica").text(`Mesures existantes : ${risk.existingMeasures}`);
      }
      doc.moveDown(0.6);
    });

    // Mention légale obligatoire en pied de chaque page.
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor("#888888").text(
        PREUVIA_DISCLAIMER,
        50,
        doc.page.height - 40,
        { width: doc.page.width - 100, align: "center" }
      );
    }

    doc.end();
  });
}
