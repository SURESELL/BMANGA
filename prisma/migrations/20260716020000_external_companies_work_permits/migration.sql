-- CreateEnum
CREATE TYPE "PermitType" AS ENUM ('FIRE', 'HEIGHT', 'LIFTING', 'CONFINED_SPACE', 'ELECTRICAL', 'LOCKOUT', 'ATEX', 'CHEMICAL');

-- CreateEnum
CREATE TYPE "PermitStatus" AS ENUM ('DRAFT', 'ISSUED', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PreventionPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "external_companies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siret" TEXT,
    "activity" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "insuranceValidUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prevention_plans" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "externalCompanyId" TEXT NOT NULL,
    "siteId" TEXT,
    "title" TEXT NOT NULL,
    "status" "PreventionPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "risksDescription" TEXT,
    "signedByClient" BOOLEAN NOT NULL DEFAULT false,
    "signedByClientAt" TIMESTAMP(3),
    "signedByCompany" BOOLEAN NOT NULL DEFAULT false,
    "signedByCompanyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prevention_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_permits" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "externalCompanyId" TEXT,
    "siteId" TEXT,
    "type" "PermitType" NOT NULL,
    "status" "PermitStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "issuedBy" TEXT,
    "issuedAt" TIMESTAMP(3),
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "resumedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_permits_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "external_companies" ADD CONSTRAINT "external_companies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prevention_plans" ADD CONSTRAINT "prevention_plans_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prevention_plans" ADD CONSTRAINT "prevention_plans_externalCompanyId_fkey" FOREIGN KEY ("externalCompanyId") REFERENCES "external_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prevention_plans" ADD CONSTRAINT "prevention_plans_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permits" ADD CONSTRAINT "work_permits_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permits" ADD CONSTRAINT "work_permits_externalCompanyId_fkey" FOREIGN KEY ("externalCompanyId") REFERENCES "external_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permits" ADD CONSTRAINT "work_permits_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

