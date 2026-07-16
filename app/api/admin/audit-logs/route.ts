import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId") ?? undefined;
  const action = searchParams.get("action") ?? undefined;

  const logs = await db.auditLog.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      organization: { select: { name: true } },
      user: { select: { email: true } },
    },
  });

  return NextResponse.json(logs);
}
