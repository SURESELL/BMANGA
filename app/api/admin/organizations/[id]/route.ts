import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const PatchSchema = z.object({
  plan: z.enum(["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]).optional(),
  seatLimit: z.number().int().positive().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  void req;
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const org = await db.organization.findUnique({
    where: { id },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      subscription: { select: { plan: true, status: true, seats: true } },
      _count: { select: { users: true } },
    },
  });

  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(org);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { plan, seatLimit } = parsed.data;

  const org = await db.organization.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.subscription.upsert({
    where: { organizationId: id },
    update: {
      ...(plan !== undefined ? { plan } : {}),
      ...(seatLimit !== undefined ? { seats: seatLimit } : {}),
    },
    create: {
      organizationId: id,
      plan: plan ?? "FREE",
      seats: seatLimit ?? 5,
    },
    include: {
      organization: { select: { id: true, name: true, createdAt: true } },
    },
  });

  return NextResponse.json(updated);
}
