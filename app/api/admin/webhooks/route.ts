import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const failedOnly = searchParams.get("failed") === "true";

  const events = await db.webhookEvent.findMany({
    where: failedOnly ? { OR: [{ error: { not: null } }, { processedAt: null }] } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      provider: true,
      eventId: true,
      type: true,
      organizationId: true,
      processedAt: true,
      error: true,
      createdAt: true,
    },
  });

  return NextResponse.json(events);
}
