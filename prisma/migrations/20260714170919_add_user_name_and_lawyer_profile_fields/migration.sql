/*
  Warnings:

  - Added the required column `name` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LawyerProfile" ADD COLUMN     "averageRating" DOUBLE PRECISION,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "consultationFee" INTEGER,
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "name" TEXT;

-- Backfill existing dev rows (pre-dates the name field) before enforcing NOT NULL.
UPDATE "User" SET "name" = COALESCE(split_part(email, '@', 1), phone, 'User') WHERE "name" IS NULL;

ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;
