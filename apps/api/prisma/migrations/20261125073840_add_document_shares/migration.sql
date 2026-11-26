-- CreateTable
CREATE TABLE "DocumentShare" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "sharedWithUserId" UUID NOT NULL,
    "sharedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentShare_documentId_revokedAt_idx" ON "DocumentShare"("documentId", "revokedAt");

-- CreateIndex
CREATE INDEX "DocumentShare_sharedWithUserId_revokedAt_idx" ON "DocumentShare"("sharedWithUserId", "revokedAt");

-- CreateIndex
CREATE INDEX "DocumentShare_sharedByUserId_idx" ON "DocumentShare"("sharedByUserId");

-- AddForeignKey
ALTER TABLE "DocumentShare" ADD CONSTRAINT "DocumentShare_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentShare" ADD CONSTRAINT "DocumentShare_sharedWithUserId_fkey" FOREIGN KEY ("sharedWithUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentShare" ADD CONSTRAINT "DocumentShare_sharedByUserId_fkey" FOREIGN KEY ("sharedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
