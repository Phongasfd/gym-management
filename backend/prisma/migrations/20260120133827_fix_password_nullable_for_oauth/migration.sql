/*
  Warnings:

  - You are about to drop the column `status` on the `Member` table. All the data in the column will be lost.
  - Made the column `phone` on table `Member` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `Member` required. This step will fail if there are existing NULL values in that column.
  - Made the column `gender` on table `Member` required. This step will fail if there are existing NULL values in that column.
  - Made the column `date_of_birth` on table `Member` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Member" DROP COLUMN "status",
ADD COLUMN     "password_hash" TEXT,
ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "gender" SET NOT NULL,
ALTER COLUMN "date_of_birth" SET NOT NULL;
