import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const CreateDocumentSchema = z.object({
  title: z.string().min(2).max(300),
  description: z.string().optional(),
  type: z.string().min(1),
  category: z.string().optional(),
  fileUrl: z.string().url().optional(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  version: z.number().int().positive().default(1),
  tags: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  const docs = await db.document.findMany({
    where: {
      organizationId: orgId,
      ...(category ? { category } : {}),
      ...(status ? { status: status as "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "ARCHIVED" | "OBSOLETE" } : {}),
      ...(type ? { type } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation requise" }, { status: 400 });

  const body = await req.json();
  const parsed = CreateDocumentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { expiresAt, ...rest } = parsed.data;

  const doc = await db.document.create({
    data: {
      ...rest,
      organizationId: orgId,
      createdBy: session.user.id,
      ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
    },
  });

  return NextResponse.json(doc, { status: 201 });
}
