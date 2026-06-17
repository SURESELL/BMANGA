import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Seeding NORMIA database...");

  // Seed Qualiopi criteria (7 critères officiels)
  const criteriaDefs = [
    { code: "C1", title: "Les conditions d'information du public sur les prestations proposées", description: "Indicateurs 1 à 3", order: 1 },
    { code: "C2", title: "L'identification précise des objectifs des prestations et l'adaptation aux publics bénéficiaires", description: "Indicateurs 4 à 7", order: 2 },
    { code: "C3", title: "L'adaptation aux publics bénéficiaires des prestations et des modalités d'accueil, d'accompagnement, de suivi et d'évaluation mises en œuvre", description: "Indicateurs 8 à 13", order: 3 },
    { code: "C4", title: "L'adéquation des moyens pédagogiques, techniques et d'encadrement aux prestations mises en œuvre", description: "Indicateurs 14 à 16", order: 4 },
    { code: "C5", title: "La qualification et développement des connaissances et compétences des personnels chargés de mettre en œuvre les prestations", description: "Indicateurs 17 à 19", order: 5 },
    { code: "C6", title: "L'inscription et investissement du prestataire dans son environnement professionnel", description: "Indicateurs 20 à 23", order: 6 },
    { code: "C7", title: "Le recueil et prise en compte des appréciations et des réclamations des parties prenantes aux prestations délivrées", description: "Indicateurs 24 à 32", order: 7 },
  ];

  for (const c of criteriaDefs) {
    await db.qualiopiCriterion.upsert({
      where: { code: c.code },
      create: c,
      update: c,
    });
  }

  // Seed reference Hazards
  const hazards = [
    { code: "CHUTE_PLAIN_PIED", family: "MECANIQUE", name: "Chute de plain-pied", category: "PHYSIQUE" },
    { code: "CHUTE_HAUTEUR", family: "MECANIQUE", name: "Chute de hauteur", category: "PHYSIQUE" },
    { code: "MANUTENTION", family: "PHYSIQUE", name: "Manutention manuelle", category: "PHYSIQUE" },
    { code: "TMS", family: "PHYSIQUE", name: "Troubles musculosquelettiques", category: "PHYSIQUE" },
    { code: "CHIMIQUE", family: "CHIMIQUE", name: "Exposition à des produits chimiques", category: "CHIMIQUE" },
    { code: "BIOLOGIQUE", family: "BIOLOGIQUE", name: "Exposition à des agents biologiques", category: "BIOLOGIQUE" },
    { code: "ELECTRIQUE", family: "ELECTRIQUE", name: "Risque électrique", category: "PHYSIQUE" },
    { code: "INCENDIE", family: "INCENDIE", name: "Incendie / Explosion", category: "PHYSIQUE" },
    { code: "MACHINES", family: "MECANIQUE", name: "Machines et équipements", category: "PHYSIQUE" },
    { code: "RPS", family: "PSYCHOLOGIQUE", name: "Risques psychosociaux", category: "PSYCHOLOGIQUE" },
    { code: "BRUIT", family: "PHYSIQUE", name: "Exposition au bruit", category: "PHYSIQUE" },
    { code: "VIBRATIONS", family: "PHYSIQUE", name: "Vibrations mécaniques", category: "PHYSIQUE" },
    { code: "ROUTIER", family: "TRANSPORT", name: "Risque routier", category: "PHYSIQUE" },
    { code: "ATEX", family: "CHIMIQUE", name: "Atmosphères explosives (ATEX)", category: "CHIMIQUE" },
    { code: "RAYONNEMENTS", family: "PHYSIQUE", name: "Rayonnements ionisants/non ionisants", category: "PHYSIQUE" },
  ];

  for (const h of hazards) {
    await db.hazard.upsert({ where: { code: h.code }, create: h, update: h });
  }

  // Seed sample regulations (FICTIF - À VALIDER avec sources officielles)
  const regulations = [
    {
      title: "Code du travail - Évaluation des risques professionnels",
      description: "Obligation d'évaluation des risques professionnels et de mise à jour du DUERP [FICTIF - À VALIDER]",
      domain: "HSE",
      source: "Code du travail - Articles L4121-1 à L4121-3 [À VÉRIFIER]",
      officialLink: "https://www.legifrance.gouv.fr",
      applicableScope: "Tout employeur, quelque soit la taille de l'entreprise",
    },
    {
      title: "Formation à la sécurité des salariés",
      description: "Obligation de formation à la sécurité lors de l'embauche [FICTIF - À VALIDER]",
      domain: "HSE",
      source: "Code du travail - Articles L4141-1 et suivants [À VÉRIFIER]",
      officialLink: "https://www.legifrance.gouv.fr",
      applicableScope: "Tout employeur",
    },
  ];

  for (const reg of regulations) {
    const existing = await db.regulation.findFirst({ where: { title: reg.title } });
    if (!existing) {
      const created = await db.regulation.create({ data: reg });
      await db.obligation.create({
        data: {
          regulationId: created.id,
          title: "Mettre à jour le DUERP [FICTIF - À VALIDER]",
          description: "Le document unique d'évaluation des risques doit être mis à jour au moins annuellement [À VÉRIFIER AVEC SOURCE OFFICIELLE]",
          expectedEvidence: "DUERP signé, daté, versionné",
          frequency: "ANNUAL",
          criticality: "HIGH",
          disclaimer: "⚠️ À vérifier avec la source officielle applicable et validation expert avant tout usage juridique ou réglementaire.",
        },
      });
    }
  }

  // Seed permissions
  const permissionDefs = [
    { module: "duerp", action: "view" },
    { module: "duerp", action: "create" },
    { module: "duerp", action: "update" },
    { module: "duerp", action: "delete" },
    { module: "duerp", action: "export" },
    { module: "risks", action: "view" },
    { module: "risks", action: "create" },
    { module: "risks", action: "update" },
    { module: "incidents", action: "view" },
    { module: "incidents", action: "create" },
    { module: "training", action: "view" },
    { module: "training", action: "create" },
    { module: "audits", action: "view" },
    { module: "audits", action: "create" },
  ];

  for (const p of permissionDefs) {
    await db.permission.upsert({
      where: { module_action: { module: p.module, action: p.action } },
      create: { module: p.module, action: p.action },
      update: {},
    });
  }

  console.log("Seed completed!");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
