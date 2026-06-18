import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const CreateDocSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  type: z.enum(["POLICY", "PROCEDURE", "FORM", "RECORD", "INSTRUCTION", "REPORT", "CONTRACT", "OTHER"]),
  category: z.string().optional(),
  version: z.string().default("1.0"),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "APPROVED", "ARCHIVED"]).default("DRAFT"),
  tags: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
  fileUrl: z.string().url().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  notes: z.string().optional(),
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
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation requise" }, { status: 400 });

  const body = await req.json();
  const parsed = CreateDocSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { expiresAt, notes: _notes, version, fileSize, ...rest } = parsed.data;

  const versionInt = parseInt(version.split(".")[0], 10) || 1;

  const doc = await db.document.create({
    data: {
      ...rest,
      version: versionInt,
      ...(fileSize !== undefined ? { fileSize: Math.round(fileSize) } : {}),
      organizationId: orgId,
      createdBy: session.user.id,
      ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
    },
  });

  return NextResponse.json(doc, { status: 201 });
}
