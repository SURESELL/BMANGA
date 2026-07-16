-- CreateEnum
CREATE TYPE "TrainingEnrollmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TrainingSessionType" AS ENUM ('FACE_TO_FACE', 'REMOTE', 'ELEARNING', 'BLENDED');

-- AlterTable
ALTER TABLE "training_enrollments" ADD COLUMN     "status" "TrainingEnrollmentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "training_sessions" DROP COLUMN "type",
ADD COLUMN     "type" "TrainingSessionType" NOT NULL DEFAULT 'FACE_TO_FACE';

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

