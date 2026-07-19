-- AlterTable
ALTER TABLE "LawyerProfile" ADD COLUMN     "isProfileCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: mark existing profiles that already satisfy the completeness
-- criteria (bio, city, experienceYears, consultationFee, >=1 specialization)
-- so already-live lawyers don't disappear from the directory on deploy.
UPDATE "LawyerProfile"
SET "isProfileCompleted" = true
WHERE "bio" IS NOT NULL AND "bio" <> ''
  AND "city" IS NOT NULL AND "city" <> ''
  AND "experienceYears" IS NOT NULL
  AND "consultationFee" IS NOT NULL
  AND array_length("specialization", 1) > 0;
