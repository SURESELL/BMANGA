import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  void req;
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const organizations = await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true } },
      subscription: { select: { plan: true, status: true, seats: true } },
    },
  });

  return NextResponse.json(organizations);
}
