-- CreateEnum
CREATE TYPE "DocumentWorkspaceType" AS ENUM ('PERSONAL', 'DEPARTMENT');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "sharedToAllAt" TIMESTAMP(3),
ADD COLUMN     "sharedToAllById" UUID,
ADD COLUMN     "workspaceType" "DocumentWorkspaceType" NOT NULL DEFAULT 'DEPARTMENT';

-- CreateIndex
CREATE INDEX "Document_workspaceType_idx" ON "Document"("workspaceType");

-- CreateIndex
CREATE INDEX "Document_sharedToAllAt_idx" ON "Document"("sharedToAllAt");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_sharedToAllById_fkey" FOREIGN KEY ("sharedToAllById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
