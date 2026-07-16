import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import type { UserRole } from "@/types";

const editSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  content: z.string().min(1).optional(),
  fileUrl: z.string().url().optional(),
  expiresAt: z.string().datetime().optional(),
});

const publishSchema = z.object({
  publish: z.boolean(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const communication = await db.safetyCommunication.findFirst({
    where: { id, organizationId: orgId ?? undefined },
    include: { site: { select: { name: true } } },
  });

  if (!communication) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(communication);
}

/**
 * "publish" est une action distincte des éditions de contenu ordinaires : une
 * fois publiée, une communication devient visible à toute l'organisation, ce
 * qui exige la permission "validate" (plus élevée que "update"), même
 * principe que la validation d'un DUERP ou l'émission d'un permis de travail.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const existing = await db.safetyCommunication.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corps de la requête invalide" }, { status: 400 });
  }

  if ("publish" in body) {
    const forbidden = requirePermission((session.user as { role?: UserRole }).role, "safety_communications", "validate");
    if (forbidden) return forbidden;

    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const updated = await db.safetyCommunication.update({
      where: { id },
      data: { publishedAt: parsed.data.publish ? new Date() : null },
    });

    await db.auditLog.create({
      data: {
        organizationId: orgId,
        userId: session.user.id,
        action: parsed.data.publish ? "PUBLISH_SAFETY_COMMUNICATION" : "UNPUBLISH_SAFETY_COMMUNICATION",
        resource: "safety_communication",
        resourceId: id,
      },
    });

    return NextResponse.json(updated);
  }

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "safety_communications", "update");
  if (forbidden) return forbidden;

  const parsed = editSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { expiresAt, ...rest } = parsed.data;

  const updated = await db.safetyCommunication.update({
    where: { id },
    data: { ...rest, ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}) },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const forbidden = requirePermission((session.user as { role?: UserRole }).role, "safety_communications", "delete");
  if (forbidden) return forbidden;

  const existing = await db.safetyCommunication.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await db.safetyCommunication.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
