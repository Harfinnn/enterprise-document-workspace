/*
  Warnings:

  - You are about to drop the column `currentVersionNumber` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `versionNumber` on the `DocumentVersion` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[documentId,majorVersion,minorVersion]` on the table `DocumentVersion` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DocumentVersion_documentId_versionNumber_key";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "currentVersionNumber",
ADD COLUMN     "currentMajorVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "currentMinorVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "DocumentVersion" DROP COLUMN "versionNumber",
ADD COLUMN     "majorVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "minorVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_majorVersion_minorVersion_key" ON "DocumentVersion"("documentId", "majorVersion", "minorVersion");
