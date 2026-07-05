-- AlterEnum
ALTER TYPE "DiplomaStatus" ADD VALUE 'REVOKED';

-- CreateTable
CREATE TABLE "Revocation" (
    "id" TEXT NOT NULL,
    "diplomaId" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "revokedBy" TEXT,
    "reason" TEXT,
    "reasonHash" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Revocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Revocation_diplomaId_key" ON "Revocation"("diplomaId");

-- CreateIndex
CREATE INDEX "Revocation_certificateId_idx" ON "Revocation"("certificateId");

-- AddForeignKey
ALTER TABLE "Revocation" ADD CONSTRAINT "Revocation_diplomaId_fkey" FOREIGN KEY ("diplomaId") REFERENCES "Diploma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
