import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import type { AuditStatus } from "@prisma/client";
import { requirePermission } from "@/lib/rbac";
import type { UserRole } from "@/types";

const VALID_AUDIT_STATUSES: AuditStatus[] = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CLOSED", "CANCELED"];

const CreateAuditSchema = z.object({
  type: z.enum(["INTERNAL", "SUPPLIER", "SAFETY", "ENVIRONMENT", "HACCP", "QUALIOPI", "ISO"]),
  title: z.string().min(2).max(200),
  siteId: z.string().optional(),
  auditorId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const statusParam = searchParams.get("status");
  const status = statusParam && VALID_AUDIT_STATUSES.includes(statusParam as AuditStatus) ? (statusParam as AuditStatus) : null;

  const audits = await db.audit.findMany({
    where: {
      organizationId: orgId,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      site: { select: { name: true } },
      _count: { select: { findings: true, nonConformities: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(audits);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation requise" }, { status: 400 });

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "audits", "create");
  if (forbidden) return forbidden;

  const body = await req.json();
  const parsed = CreateAuditSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { scheduledAt, ...rest } = parsed.data;

  const audit = await db.audit.create({
    data: {
      ...rest,
      organizationId: orgId,
      ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id!,
      action: "CREATE_AUDIT",
      resource: "Audit",
      resourceId: audit.id,
      organizationId: orgId,
    },
  });

  return NextResponse.json(audit, { status: 201 });
}
