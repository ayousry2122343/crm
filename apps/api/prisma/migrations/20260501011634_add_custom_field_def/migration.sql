-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'LONG_TEXT', 'NUMBER', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATETIME', 'PICKLIST', 'MULTI_PICKLIST', 'LOOKUP', 'URL', 'EMAIL', 'PHONE', 'FILE', 'FORMULA', 'ROLLUP');

-- CreateTable
CREATE TABLE "CustomFieldDef" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" JSONB NOT NULL,
    "type" "CustomFieldType" NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "unique" BOOLEAN NOT NULL DEFAULT false,
    "indexed" BOOLEAN NOT NULL DEFAULT false,
    "default" JSONB,
    "validation" JSONB,
    "helpText" JSONB,
    "visibleToProfileIds" TEXT[],
    "editableByProfileIds" TEXT[],
    "formulaExpr" TEXT,
    "rollupConfig" JSONB,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomFieldDef_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomFieldDef_workspaceId_entityType_idx" ON "CustomFieldDef"("workspaceId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDef_workspaceId_entityType_key_key" ON "CustomFieldDef"("workspaceId", "entityType", "key");

-- AddForeignKey
ALTER TABLE "CustomFieldDef" ADD CONSTRAINT "CustomFieldDef_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
