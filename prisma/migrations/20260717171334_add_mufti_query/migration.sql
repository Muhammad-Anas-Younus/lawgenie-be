-- CreateEnum
CREATE TYPE "MuftiQueryUrgency" AS ENUM ('STANDARD', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MuftiQueryStatus" AS ENUM ('PENDING_PAYMENT', 'PENDING_RESPONSE', 'RESPONDED', 'REJECTED');

-- CreateTable
CREATE TABLE "MuftiQuery" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "muftiId" TEXT,
    "urgency" "MuftiQueryUrgency" NOT NULL,
    "fee" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "citations" TEXT[],
    "status" "MuftiQueryStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "MuftiQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MuftiQuery_caseId_idx" ON "MuftiQuery"("caseId");

-- CreateIndex
CREATE INDEX "MuftiQuery_muftiId_idx" ON "MuftiQuery"("muftiId");

-- CreateIndex
CREATE INDEX "MuftiQuery_status_idx" ON "MuftiQuery"("status");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_muftiQueryId_fkey" FOREIGN KEY ("muftiQueryId") REFERENCES "MuftiQuery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MuftiQuery" ADD CONSTRAINT "MuftiQuery_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MuftiQuery" ADD CONSTRAINT "MuftiQuery_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MuftiQuery" ADD CONSTRAINT "MuftiQuery_muftiId_fkey" FOREIGN KEY ("muftiId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
