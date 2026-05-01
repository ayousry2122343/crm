-- CreateTable
CREATE TABLE "List" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "query" JSONB NOT NULL,
    "memberIds" TEXT[],
    "ownerId" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "List_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "List_workspaceId_entityType_idx" ON "List"("workspaceId", "entityType");

-- CreateIndex
CREATE INDEX "List_workspaceId_ownerId_idx" ON "List"("workspaceId", "ownerId");

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
