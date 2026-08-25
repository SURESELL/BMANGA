import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/prisma/generated/client";

export type AuditAction =
  | "login"
  | "login_failed"
  | "logout"
  | "connect_account"
  | "disconnect_account"
  | "generate"
  | "approve"
  | "reject"
  | "edit_after_approval"
  | "schedule"
  | "publish"
  | "publish_failed"
  | "delete"
  | "settings_change";

export async function writeAuditLog(params: {
  workspaceId: string;
  userId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  contentMasterId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      workspaceId: params.workspaceId,
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      contentMasterId: params.contentMasterId,
      metadata: params.metadata,
    },
  });
}
