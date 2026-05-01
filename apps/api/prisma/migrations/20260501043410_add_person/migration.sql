-- CreateEnum
CREATE TYPE "LifecycleStage" AS ENUM ('LEAD', 'MQL', 'SQL', 'OPP', 'CUSTOMER', 'EVANGELIST');

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "isCompany" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "fullName" TEXT NOT NULL,
    "companyName" TEXT,
    "email" TEXT,
    "emailNormalized" TEXT,
    "phone" TEXT,
    "phoneNormalized" TEXT,
    "title" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "address" JSONB,
    "lifecycleStage" "LifecycleStage" NOT NULL DEFAULT 'LEAD',
    "source" TEXT,
    "ownerId" TEXT,
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "consent" JSONB,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Person_workspaceId_emailNormalized_idx" ON "Person"("workspaceId", "emailNormalized");

-- CreateIndex
CREATE INDEX "Person_workspaceId_phoneNormalized_idx" ON "Person"("workspaceId", "phoneNormalized");

-- CreateIndex
CREATE INDEX "Person_workspaceId_ownerId_idx" ON "Person"("workspaceId", "ownerId");

-- CreateIndex
CREATE INDEX "Person_workspaceId_lifecycleStage_idx" ON "Person"("workspaceId", "lifecycleStage");

-- CreateIndex
CREATE INDEX "Person_workspaceId_isCompany_idx" ON "Person"("workspaceId", "isCompany");

-- CreateIndex
CREATE INDEX "Person_workspaceId_archivedAt_idx" ON "Person"("workspaceId", "archivedAt");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
