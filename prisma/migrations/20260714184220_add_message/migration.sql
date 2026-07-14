-- CreateEnum
CREATE TYPE "ThreadType" AS ENUM ('CONSULTATION', 'CASE');

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "threadType" "ThreadType" NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_threadType_threadId_idx" ON "Message"("threadType", "threadId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
