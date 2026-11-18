-- CreateEnum
CREATE TYPE "PasswordResetChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateTable
CREATE TABLE "PasswordResetChallenge" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "channel" "PasswordResetChannel" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedIp" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "PasswordResetChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetChallenge_tokenHash_key" ON "PasswordResetChallenge"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetChallenge_userId_channel_createdAt_idx" ON "PasswordResetChallenge"("userId", "channel", "createdAt");

-- CreateIndex
CREATE INDEX "PasswordResetChallenge_expiresAt_idx" ON "PasswordResetChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetChallenge_consumedAt_idx" ON "PasswordResetChallenge"("consumedAt");

-- AddForeignKey
ALTER TABLE "PasswordResetChallenge" ADD CONSTRAINT "PasswordResetChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
