import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateOrgSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  siret: z.string().optional(),
  sector: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 404 });

  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) return NextResponse.json({ error: "Organisation introuvable" }, { status: 404 });

  return NextResponse.json(org);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });

  const body = await req.json();
  const parsed = UpdateOrgSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { website, ...rest } = parsed.data;
  const org = await db.organization.update({
    where: { id: orgId },
    data: { ...rest, ...(website ? { website } : {}) },
  });

  return NextResponse.json(org);
}
