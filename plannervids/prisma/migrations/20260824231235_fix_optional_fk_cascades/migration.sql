-- DropForeignKey
ALTER TABLE "PlatformPost" DROP CONSTRAINT "PlatformPost_socialAccountId_fkey";

-- AddForeignKey
ALTER TABLE "PlatformPost" ADD CONSTRAINT "PlatformPost_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
