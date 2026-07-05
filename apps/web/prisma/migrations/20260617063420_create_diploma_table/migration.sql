-- CreateEnum
CREATE TYPE "DiplomaStatus" AS ENUM ('PENDING', 'VALID', 'INVALID');

-- CreateTable
CREATE TABLE "Diploma" (
    "id" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "nim" TEXT NOT NULL,
    "diplomaNumber" TEXT NOT NULL,
    "studyProgram" TEXT NOT NULL,
    "graduationYear" INTEGER NOT NULL,
    "fileUrl" TEXT,
    "fileHash" TEXT,
    "ipfsCid" TEXT,
    "blockchainTxHash" TEXT,
    "status" "DiplomaStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Diploma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Diploma_diplomaNumber_key" ON "Diploma"("diplomaNumber");
