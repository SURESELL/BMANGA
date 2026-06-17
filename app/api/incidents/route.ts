import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const createIncidentSchema = z.object({
  title:            z.string().min(3).max(200),
  description:      z.string().min(10),
  type:             z.enum(["INCIDENT", "ACCIDENT", "NEAR_MISS"]),
  severity:         z.enum(["NEAR_MISS", "MINOR", "SIGNIFICANT", "SERIOUS", "CRITICAL", "FATAL"]),
  occurredAt:       z.string().datetime(),
  location:         z.string().optional(),
  siteId:           z.string().optional(),
  injuredPersons:   z.number().int().min(0).default(0),
  firstAidGiven:    z.boolean().default(false),
  workStopped:      z.boolean().default(false),
  witnesses:        z.string().optional(),
  immediateActions: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const incidents = await db.incident.findMany({
    where: { organizationId: orgId },
    include: {
      site: { select: { name: true } },
      reporter: { select: { name: true } },
      actionPlans: { select: { id: true, status: true } },
    },
    orderBy: { occurredAt: "desc" },
  });

  return NextResponse.json(incidents);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const body = await req.json();
  const parsed = createIncidentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });

  const incident = await db.incident.create({
    data: {
      ...parsed.data,
      organizationId: orgId,
      reporterId: session.user.id,
      occurredAt: new Date(parsed.data.occurredAt),
      status: "DECLARED",
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session.user.id,
      action: "DECLARE_INCIDENT",
      resource: "incident",
      resourceId: incident.id,
    },
  });

  return NextResponse.json(incident, { status: 201 });
}
