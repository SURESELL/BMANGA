import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const CreateEPISchema = z.object({
  name: z.string().min(2).max(200),
  category: z.string().min(1),
  reference: z.string().optional(),
  standard: z.string().optional(),
  quantity: z.number().int().min(0).default(1),
  siteId: z.string().optional(),
  assignedTo: z.string().optional(),
  assignedDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  nextControlDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const CreateVerificationSchema = z.object({
  name: z.string().min(2).max(200),
  equipment: z.string().min(1),
  frequency: z.string().min(1),
  siteId: z.string().optional(),
  lastVerifiedAt: z.string().datetime().optional(),
  nextVerificationAt: z.string().datetime().optional(),
  verifiedBy: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ epiItems: [], verifications: [] });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "epi" | "verification"

  if (type === "verification") {
    const verifications = await db.periodicVerification.findMany({
      where: { organizationId: orgId },
      include: { site: { select: { name: true } } },
      orderBy: { nextVerificationAt: "asc" },
    });
    return NextResponse.json(verifications);
  }

  const [epiItems, verifications] = await Promise.all([
    db.ePIItem.findMany({
      where: { organizationId: orgId },
      include: { site: { select: { name: true } } },
      orderBy: { expiryDate: "asc" },
    }),
    db.periodicVerification.findMany({
      where: { organizationId: orgId },
      include: { site: { select: { name: true } } },
      orderBy: { nextVerificationAt: "asc" },
    }),
  ]);

  return NextResponse.json({ epiItems, verifications });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Organisation requise" }, { status: 400 });

  const body = await req.json();
  const { resourceType, ...data } = body;

  if (resourceType === "verification") {
    const parsed = CreateVerificationSchema.safeParse(data);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { lastVerifiedAt, nextVerificationAt, ...rest } = parsed.data;
    const verification = await db.periodicVerification.create({
      data: {
        ...rest,
        organizationId: orgId,
        ...(lastVerifiedAt ? { lastVerifiedAt: new Date(lastVerifiedAt) } : {}),
        ...(nextVerificationAt ? { nextVerificationAt: new Date(nextVerificationAt) } : {}),
      },
    });
    return NextResponse.json(verification, { status: 201 });
  }

  const parsed = CreateEPISchema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { assignedDate, expiryDate, nextControlDate, ...rest } = parsed.data;
  const epi = await db.ePIItem.create({
    data: {
      ...rest,
      organizationId: orgId,
      ...(assignedDate ? { assignedDate: new Date(assignedDate) } : {}),
      ...(expiryDate ? { expiryDate: new Date(expiryDate) } : {}),
      ...(nextControlDate ? { nextControlDate: new Date(nextControlDate) } : {}),
    },
  });

  return NextResponse.json(epi, { status: 201 });
}
