-- AlterTable
ALTER TABLE "duerps" ADD COLUMN     "previousVersionId" TEXT;

-- AddForeignKey
ALTER TABLE "duerps" ADD CONSTRAINT "duerps_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "duerps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

