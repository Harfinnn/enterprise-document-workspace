-- CreateTable
CREATE TABLE "PhoneVerificationChallenge" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedIp" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "PhoneVerificationChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhoneVerificationChallenge_userId_createdAt_idx" ON "PhoneVerificationChallenge"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PhoneVerificationChallenge_expiresAt_idx" ON "PhoneVerificationChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "PhoneVerificationChallenge_consumedAt_idx" ON "PhoneVerificationChallenge"("consumedAt");

-- AddForeignKey
ALTER TABLE "PhoneVerificationChallenge" ADD CONSTRAINT "PhoneVerificationChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
