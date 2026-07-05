-- CreateEnum
CREATE TYPE "IssuerStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ISSUER_ADMIN');

-- CreateTable
CREATE TABLE "Issuer" (
    "id" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "mspId" TEXT NOT NULL,
    "status" "IssuerStatus" NOT NULL DEFAULT 'ACTIVE',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issuer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ISSUER_ADMIN',
    "issuerDbId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Issuer_issuerId_key" ON "Issuer"("issuerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_issuerDbId_fkey" FOREIGN KEY ("issuerDbId") REFERENCES "Issuer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
