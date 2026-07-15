-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "siretConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "siretConfirmedBy" TEXT,
ADD COLUMN     "siretFetchedAt" TIMESTAMP(3),
ADD COLUMN     "siretSource" TEXT;

