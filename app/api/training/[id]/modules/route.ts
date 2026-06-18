import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const CreateModuleSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  order: z.number().int().min(0).default(0),
  duration: z.number().int().min(1).optional(),
  content: z.string().optional(),
  videoUrl: z.string().url().optional(),
  pdfUrl: z.string().url().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  const { id } = await params;

  const course = await db.trainingCourse.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!course) return NextResponse.json({ error: "Formation introuvable" }, { status: 404 });

  const modules = await db.trainingModule.findMany({
    where: { courseId: id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(modules);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  const { id } = await params;

  const course = await db.trainingCourse.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!course) return NextResponse.json({ error: "Formation introuvable" }, { status: 404 });

  const body = await req.json();
  const parsed = CreateModuleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Auto-assign order if not provided
  if (!parsed.data.order) {
    const lastModule = await db.trainingModule.findFirst({
      where: { courseId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    parsed.data.order = (lastModule?.order ?? 0) + 1;
  }

  const module = await db.trainingModule.create({
    data: { ...parsed.data, courseId: id },
  });

  return NextResponse.json(module, { status: 201 });
}
