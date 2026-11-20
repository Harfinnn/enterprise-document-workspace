/*
  Warnings:

  - A unique constraint covering the columns `[pendingPhoneNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pendingPhoneNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_pendingPhoneNumber_key" ON "User"("pendingPhoneNumber");
