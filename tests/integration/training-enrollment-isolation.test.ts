import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";

// Régression : app/api/training/[id]/sessions/[sessionId]/enrollments/route.ts
// PATCH ne vérifiait auparavant AUCUNE appartenance à l'organisation avant de
// modifier le statut d'une inscription — seul sessionId+enrollmentId étaient
// comparés. Un appelant authentifié dans N'IMPORTE QUELLE organisation
// pouvait donc modifier le statut d'une inscription d'une autre organisation
// en devinant/énumérant les identifiants. Ce test reproduit exactement la
// requête corrigée (jointure via session.organizationId) et prouve qu'elle
// bloque l'accès inter-tenant.

const suffix = `test-${Date.now()}`;
let orgA: { id: string };
let orgB: { id: string };
let courseA: { id: string };
let sessionA: { id: string };
let learnerA: { id: string };
let enrollmentA: { id: string };

beforeAll(async () => {
  orgA = await db.organization.create({ data: { name: `Training Org A ${suffix}`, slug: `training-org-a-${suffix}` } });
  orgB = await db.organization.create({ data: { name: `Training Org B ${suffix}`, slug: `training-org-b-${suffix}` } });

  courseA = await db.trainingCourse.create({
    data: { organizationId: orgA.id, title: `Cours confidentiel ${suffix}` },
  });

  sessionA = await db.trainingSession.create({
    data: {
      organizationId: orgA.id,
      courseId: courseA.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
    },
  });

  learnerA = await db.user.create({
    data: { email: `learner-a-${suffix}@preuvia.test`, organizationId: orgA.id, isActive: true },
  });

  enrollmentA = await db.trainingEnrollment.create({
    data: { userId: learnerA.id, courseId: courseA.id, sessionId: sessionA.id, status: "PENDING" },
  });
});

afterAll(async () => {
  await db.trainingEnrollment.deleteMany({ where: { id: enrollmentA.id } });
  await db.user.deleteMany({ where: { id: learnerA.id } });
  await db.trainingSession.deleteMany({ where: { id: sessionA.id } });
  await db.trainingCourse.deleteMany({ where: { id: courseA.id } });
  await db.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
  await db.$disconnect();
});

describe("training enrollment PATCH tenant isolation (IDOR regression)", () => {
  it("finds the enrollment when scoped to the owning organization", async () => {
    const found = await db.trainingEnrollment.findFirst({
      where: {
        id: enrollmentA.id,
        sessionId: sessionA.id,
        session: { courseId: courseA.id, organizationId: orgA.id },
      },
    });
    expect(found).not.toBeNull();
  });

  it("returns nothing when a different organization's id is used, even with correct enrollmentId+sessionId", async () => {
    const found = await db.trainingEnrollment.findFirst({
      where: {
        id: enrollmentA.id,
        sessionId: sessionA.id,
        session: { courseId: courseA.id, organizationId: orgB.id },
      },
    });
    expect(found).toBeNull();
  });
});
