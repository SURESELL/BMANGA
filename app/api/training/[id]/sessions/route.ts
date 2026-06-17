import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const CreateSessionSchema = z.object({
  title: z.string().optional(),
  type: z.enum(["FACE_TO_FACE", "REMOTE", "ELEARNING", "BLENDED"]).default("FACE_TO_FACE"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  location: z.string().optional(),
  virtualLink: z.string().url().optional(),
  maxLearners: z.number().int().positive().optional(),
  trainerId: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  const { id } = await params;

  const course = await db.trainingCourse.findFirst({ where: { id, organizationId: orgId ?? undefined } });
  if (!course) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const sessions = await db.trainingSession.findMany({
    where: { courseId: id },
    include: { _count: { select: { enrollments: true } } },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation requise" }, { status: 400 });

  const { id } = await params;

  const course = await db.trainingCourse.findFirst({ where: { id, organizationId: orgId } });
  if (!course) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json();
  const parsed = CreateSessionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { startDate, endDate, ...rest } = parsed.data;

  const trainingSession = await db.trainingSession.create({
    data: {
      ...rest,
      courseId: id,
      organizationId: orgId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
  });

  return NextResponse.json(trainingSession, { status: 201 });
}
