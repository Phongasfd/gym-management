/*
  Warnings:

  - You are about to drop the column `facebookId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `googleId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isProfileComplete` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[googleId]` on the table `Member` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[facebookId]` on the table `Member` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User_facebookId_key";

-- DropIndex
DROP INDEX "User_googleId_key";

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "facebookId" TEXT,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "isProfileComplete" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "gender" DROP NOT NULL,
ALTER COLUMN "date_of_birth" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "facebookId",
DROP COLUMN "googleId",
DROP COLUMN "isProfileComplete";

-- CreateIndex
CREATE UNIQUE INDEX "Member_googleId_key" ON "Member"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_facebookId_key" ON "Member"("facebookId");
