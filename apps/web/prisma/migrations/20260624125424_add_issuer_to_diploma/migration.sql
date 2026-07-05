-- AlterTable
ALTER TABLE "Diploma" ADD COLUMN     "issuerId" TEXT;

-- CreateIndex
CREATE INDEX "Diploma_issuerId_idx" ON "Diploma"("issuerId");

-- AddForeignKey
ALTER TABLE "Diploma" ADD CONSTRAINT "Diploma_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Issuer"("issuerId") ON DELETE SET NULL ON UPDATE CASCADE;
