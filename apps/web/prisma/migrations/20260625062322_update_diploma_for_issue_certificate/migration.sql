/*
  Warnings:

  - A unique constraint covering the columns `[certificateId]` on the table `Diploma` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Diploma" ADD COLUMN     "certificateId" TEXT,
ADD COLUMN     "certificateType" TEXT NOT NULL DEFAULT 'DIPLOMA',
ADD COLUMN     "documentHash" TEXT,
ADD COLUMN     "expiredAt" TIMESTAMP(3),
ADD COLUMN     "issuedAt" TIMESTAMP(3),
ADD COLUMN     "studentIdHash" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "uploadedFileMimeType" TEXT,
ADD COLUMN     "uploadedFileName" TEXT,
ADD COLUMN     "uploadedFileSize" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Diploma_certificateId_key" ON "Diploma"("certificateId");
