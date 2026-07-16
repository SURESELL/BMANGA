import { describe, expect, it } from "vitest";
import { omitProtectedFields } from "@/lib/api-utils";

// Régression : app/api/epi/[id]/route.ts et app/api/haccp/[id]/route.ts
// faisaient `data: { ...body }` sur PATCH sans filtrer les clés du corps de
// la requête. Un appelant pouvait inclure `organizationId` (ou `planId` pour
// un CCP) dans le body pour réassigner sa propre ressource à une AUTRE
// organisation — un contournement direct de l'isolation multi-tenant malgré
// le contrôle d'appartenance fait par le `findFirst` précédent, puisque
// celui-ci ne portait que sur l'état AVANT la mise à jour.
describe("omitProtectedFields", () => {
  it("strips organizationId, id, createdAt and updatedAt by default", () => {
    const result = omitProtectedFields({
      organizationId: "attacker-controlled-org-id",
      id: "attacker-controlled-id",
      createdAt: "2020-01-01",
      updatedAt: "2020-01-01",
      name: "Legit update",
    });
    expect(result).toEqual({ name: "Legit update" });
    expect(result.organizationId).toBeUndefined();
  });

  it("also strips caller-specified extra keys (e.g. a tenant-boundary foreign key like planId)", () => {
    const result = omitProtectedFields(
      { planId: "attacker-controlled-plan-id", step: "Cuisson" },
      ["planId"]
    );
    expect(result).toEqual({ step: "Cuisson" });
  });

  it("leaves ordinary fields untouched", () => {
    const result = omitProtectedFields({ name: "Extincteur A", quantity: 3, siteId: "site_1" });
    expect(result).toEqual({ name: "Extincteur A", quantity: 3, siteId: "site_1" });
  });

  it("never mutates the original object", () => {
    const original = { organizationId: "org_1", name: "x" };
    omitProtectedFields(original);
    expect(original.organizationId).toEqual("org_1");
  });
});
