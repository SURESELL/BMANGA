import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const createCourseSchema = z.object({
  title:         z.string().min(3).max(200),
  description:   z.string().optional(),
  objectives:    z.string().optional(),
  prerequisites: z.string().optional(),
  type:          z.enum(["E_LEARNING", "FACE_TO_FACE", "HYBRID", "VIRTUAL_CLASS", "WEBINAR"]),
  level:         z.string().optional(),
  category:      z.string().optional(),
  duration:      z.number().int().positive().optional(),
  price:         z.number().min(0).optional(),
  isCertifying:  z.boolean().default(false),
  isPublic:      z.boolean().default(false),
  tags:          z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const isPublic = searchParams.get("public") === "true";

  const courses = await db.trainingCourse.findMany({
    where: {
      ...(isPublic ? { isPublic: true } : { organizationId: orgId }),
      ...(type && { type: type as never }),
      ...(status && { status: status as never }),
    },
    include: {
      _count: { select: { enrollments: true, modules: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(courses);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const body = await req.json();
  const parsed = createCourseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });

  const course = await db.trainingCourse.create({
    data: {
      ...parsed.data,
      tags: parsed.data.tags ?? [],
      organizationId: orgId,
      status: "DRAFT",
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session.user.id,
      action: "CREATE_TRAINING",
      resource: "trainingCourse",
      resourceId: course.id,
    },
  });

  return NextResponse.json(course, { status: 201 });
}
