import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const updateSchema = z.object({
  title:         z.string().min(3).max(200).optional(),
  description:   z.string().optional(),
  objectives:    z.string().optional(),
  prerequisites: z.string().optional(),
  type:          z.enum(["E_LEARNING", "FACE_TO_FACE", "HYBRID", "VIRTUAL_CLASS", "WEBINAR"]).optional(),
  level:         z.string().optional(),
  category:      z.string().optional(),
  duration:      z.number().int().positive().optional(),
  price:         z.number().min(0).optional(),
  isCertifying:  z.boolean().optional(),
  isPublic:      z.boolean().optional(),
  status:        z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const orgId = (session.user as { organizationId?: string }).organizationId;

  const course = await db.trainingCourse.findFirst({
    where: { id, OR: [{ organizationId: orgId }, { isPublic: true }] },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { quizzes: true },
      },
      sessions: { orderBy: { startDate: "desc" } },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(course);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const orgId = (session.user as { organizationId?: string }).organizationId;

  const course = await db.trainingCourse.findFirst({ where: { id, organizationId: orgId } });
  if (!course) return NextResponse.json({ error: "Non trouvé ou non autorisé" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const updated = await db.trainingCourse.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const orgId = (session.user as { organizationId?: string }).organizationId;

  const course = await db.trainingCourse.findFirst({ where: { id, organizationId: orgId } });
  if (!course) return NextResponse.json({ error: "Non trouvé ou non autorisé" }, { status: 404 });

  await db.trainingCourse.update({ where: { id }, data: { status: "ARCHIVED" } });
  return NextResponse.json({ success: true });
}
