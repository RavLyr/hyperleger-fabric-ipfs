-- CreateEnum
CREATE TYPE "BulkUploadJobStatus" AS ENUM ('CREATED', 'UPLOADING', 'VALIDATING', 'READY', 'PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BulkUploadItemStatus" AS ENUM ('PENDING', 'VALIDATED', 'STAGED', 'IPFS_UPLOADED', 'FABRIC_COMMITTED', 'DB_PERSISTED', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "bulk_upload_jobs" (
    "id" SERIAL NOT NULL,
    "job_id" TEXT NOT NULL,
    "issuer_id" TEXT NOT NULL,
    "status" "BulkUploadJobStatus" NOT NULL DEFAULT 'CREATED',
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "processed_items" INTEGER NOT NULL DEFAULT 0,
    "failed_items" INTEGER NOT NULL DEFAULT 0,
    "manifest_path" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_upload_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_upload_items" (
    "id" SERIAL NOT NULL,
    "item_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "pdf_file_name" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "status" "BulkUploadItemStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "staged_object_key" TEXT,
    "ipfs_cid" TEXT,
    "ledger_tx_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_upload_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bulk_upload_jobs_job_id_key" ON "bulk_upload_jobs"("job_id");

-- CreateIndex
CREATE INDEX "bulk_upload_jobs_issuer_id_idx" ON "bulk_upload_jobs"("issuer_id");

-- CreateIndex
CREATE INDEX "bulk_upload_jobs_status_idx" ON "bulk_upload_jobs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bulk_upload_items_item_id_key" ON "bulk_upload_items"("item_id");

-- CreateIndex
CREATE INDEX "bulk_upload_items_job_id_status_idx" ON "bulk_upload_items"("job_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bulk_upload_items_job_id_certificate_number_key" ON "bulk_upload_items"("job_id", "certificate_number");

-- AddForeignKey
ALTER TABLE "bulk_upload_jobs" ADD CONSTRAINT "bulk_upload_jobs_issuer_id_fkey" FOREIGN KEY ("issuer_id") REFERENCES "issuers"("issuer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_upload_items" ADD CONSTRAINT "bulk_upload_items_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "bulk_upload_jobs"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;
