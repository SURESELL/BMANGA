import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "APPROVED", "ARCHIVED", "OBSOLETE"]).optional(),
  version: z.number().int().min(1).optional(),
  category: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const doc = await db.document.findFirst({
    where: { id, organizationId: orgId ?? undefined },
    include: {
      organization: { select: { id: true } },
    },
  });

  if (!doc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Fetch creator separately since Document uses createdBy (string ID)
  let creator = null;
  if (doc.createdBy) {
    creator = await db.user.findUnique({
      where: { id: doc.createdBy },
      select: { name: true, email: true },
    });
  }

  return NextResponse.json({ ...doc, creator });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const doc = await db.document.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!doc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { expiresAt, ...rest } = parsed.data;

  const shouldApprove = rest.status === "APPROVED" && doc.status !== "APPROVED";
  const userId = (session.user as { id?: string })?.id;

  const updated = await db.document.update({
    where: { id },
    data: {
      ...rest,
      ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
      ...(shouldApprove ? { approvedAt: new Date(), approvedBy: userId } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const { id } = await params;

  const doc = await db.document.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!doc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await db.document.update({ where: { id }, data: { status: "ARCHIVED" } });
  return NextResponse.json({ ok: true });
}
