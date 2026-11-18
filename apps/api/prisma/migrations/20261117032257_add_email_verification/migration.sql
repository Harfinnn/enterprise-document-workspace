-- CreateTable
CREATE TABLE "EmailVerificationChallenge" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedIp" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "EmailVerificationChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationChallenge_tokenHash_key" ON "EmailVerificationChallenge"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationChallenge_userId_createdAt_idx" ON "EmailVerificationChallenge"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailVerificationChallenge_expiresAt_idx" ON "EmailVerificationChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "EmailVerificationChallenge_consumedAt_idx" ON "EmailVerificationChallenge"("consumedAt");

-- AddForeignKey
ALTER TABLE "EmailVerificationChallenge" ADD CONSTRAINT "EmailVerificationChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
