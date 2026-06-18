import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const riskId = searchParams.get("riskId");
  const incidentId = searchParams.get("incidentId");
  const status = searchParams.get("status");

  const actionPlans = await db.actionPlan.findMany({
    where: {
      organizationId: orgId,
      ...(riskId ? { riskId } : {}),
      ...(incidentId ? { incidentId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      risk: { select: { id: true, description: true } },
      incident: { select: { id: true, title: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json(actionPlans);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const userId = session.user.id;

  if (!orgId || !userId) {
    return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 });
  }

  let body: {
    title?: unknown;
    description?: unknown;
    type?: unknown;
    priority?: unknown;
    riskId?: unknown;
    incidentId?: unknown;
    ownerId?: unknown;
    dueDate?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps de la requête invalide" }, { status: 400 });
  }

  if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "Le titre est requis" }, { status: 400 });
  }

  const actionPlan = await db.actionPlan.create({
    data: {
      organizationId: orgId,
      title: (body.title as string).trim(),
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      type: typeof body.type === "string" ? body.type : "CORRECTIVE",
      priority: typeof body.priority === "number" ? body.priority : 3,
      status: "TODO",
      riskId: typeof body.riskId === "string" ? body.riskId : null,
      incidentId: typeof body.incidentId === "string" ? body.incidentId : null,
      ownerId: typeof body.ownerId === "string" ? body.ownerId : null,
      dueDate: body.dueDate ? new Date(body.dueDate as string) : null,
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId,
      action: "CREATE",
      resource: "ActionPlan",
      resourceId: actionPlan.id,
      details: JSON.stringify({ title: actionPlan.title, riskId: body.riskId, incidentId: body.incidentId }),
    },
  });

  return NextResponse.json(actionPlan, { status: 201 });
}
