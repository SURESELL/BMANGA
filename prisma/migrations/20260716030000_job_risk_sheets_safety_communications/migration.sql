-- CreateEnum
CREATE TYPE "SafetyCommunicationType" AS ENUM ('POSTER', 'FLASH');

-- CreateTable
CREATE TABLE "job_risk_sheets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT,
    "jobTitle" TEXT NOT NULL,
    "description" TEXT,
    "requiredPPE" TEXT,
    "requiredTraining" TEXT,
    "risksDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_risk_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_communications" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT,
    "type" "SafetyCommunicationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fileUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_communications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "job_risk_sheets" ADD CONSTRAINT "job_risk_sheets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_risk_sheets" ADD CONSTRAINT "job_risk_sheets_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_communications" ADD CONSTRAINT "safety_communications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_communications" ADD CONSTRAINT "safety_communications_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

