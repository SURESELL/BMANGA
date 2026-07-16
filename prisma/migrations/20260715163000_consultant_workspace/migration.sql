-- CreateEnum
CREATE TYPE "ConsultantAccessStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "consultancyWorkspaceId" TEXT;

-- CreateTable
CREATE TABLE "consultancy_workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultancy_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultant_client_access" (
    "id" TEXT NOT NULL,
    "consultancyWorkspaceId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "ConsultantAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "grantedByUserId" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedByUserId" TEXT,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "consultant_client_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consultancy_workspaces_slug_key" ON "consultancy_workspaces"("slug");

-- CreateIndex
CREATE INDEX "consultant_client_access_organizationId_idx" ON "consultant_client_access"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "consultant_client_access_consultancyWorkspaceId_organizatio_key" ON "consultant_client_access"("consultancyWorkspaceId", "organizationId");

-- AddForeignKey
ALTER TABLE "consultant_client_access" ADD CONSTRAINT "consultant_client_access_consultancyWorkspaceId_fkey" FOREIGN KEY ("consultancyWorkspaceId") REFERENCES "consultancy_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_client_access" ADD CONSTRAINT "consultant_client_access_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_consultancyWorkspaceId_fkey" FOREIGN KEY ("consultancyWorkspaceId") REFERENCES "consultancy_workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

