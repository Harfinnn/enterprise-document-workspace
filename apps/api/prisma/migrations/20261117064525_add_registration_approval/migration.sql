-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "RegistrationRequest" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "employeeNo" TEXT,
    "requestedDepartmentId" UUID,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdUserId" UUID,
    "requestIp" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountActivationChallenge" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountActivationChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationRequest_createdUserId_key" ON "RegistrationRequest"("createdUserId");

-- CreateIndex
CREATE INDEX "RegistrationRequest_email_idx" ON "RegistrationRequest"("email");

-- CreateIndex
CREATE INDEX "RegistrationRequest_status_createdAt_idx" ON "RegistrationRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RegistrationRequest_requestedDepartmentId_idx" ON "RegistrationRequest"("requestedDepartmentId");

-- CreateIndex
CREATE INDEX "RegistrationRequest_reviewedById_idx" ON "RegistrationRequest"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "AccountActivationChallenge_tokenHash_key" ON "AccountActivationChallenge"("tokenHash");

-- CreateIndex
CREATE INDEX "AccountActivationChallenge_userId_idx" ON "AccountActivationChallenge"("userId");

-- CreateIndex
CREATE INDEX "AccountActivationChallenge_expiresAt_idx" ON "AccountActivationChallenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_requestedDepartmentId_fkey" FOREIGN KEY ("requestedDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_createdUserId_fkey" FOREIGN KEY ("createdUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountActivationChallenge" ADD CONSTRAINT "AccountActivationChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
