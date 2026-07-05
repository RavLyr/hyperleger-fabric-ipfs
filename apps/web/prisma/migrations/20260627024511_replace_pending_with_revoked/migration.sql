-- Manual reconciliation for replacing PENDING with REVOKED.
-- The database migration record already exists, so this file is restored
-- to keep Prisma migration history in sync.

ALTER TABLE "Diploma"
ALTER COLUMN "status" SET DEFAULT 'VALID';