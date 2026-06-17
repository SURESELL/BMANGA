import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const CreateNCSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(5),
  type: z.enum(["MINOR", "MAJOR", "CRITICAL"]).default("MINOR"),
  auditId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  rootCause: z.string().optional(),
  correctiveAction: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  const ncs = await db.nonConformity.findMany({
    where: {
      organizationId: orgId,
      ...(status ? { status: status as "TODO" | "IN_PROGRESS" | "DONE" | "CANCELED" } : {}),
      ...(type ? { type } : {}),
    },
    include: { audit: { select: { title: true, type: true } } },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(ncs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation requise" }, { status: 400 });

  const body = await req.json();
  const parsed = CreateNCSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { dueDate, ...rest } = parsed.data;

  const nc = await db.nonConformity.create({
    data: {
      ...rest,
      organizationId: orgId,
      ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
    },
  });

  return NextResponse.json(nc, { status: 201 });
}
