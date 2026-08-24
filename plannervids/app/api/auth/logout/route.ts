import { NextResponse } from "next/server";
import { getSession, clearSessionCookie } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";

export async function POST() {
  const session = await getSession();
  if (session) {
    await writeAuditLog({ workspaceId: session.workspaceId, userId: session.sub, action: "logout" });
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
