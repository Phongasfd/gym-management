-- AlterTable
ALTER TABLE "Member" ADD COLUMN "reset_code" TEXT,
ADD COLUMN "reset_code_expires" TIMESTAMP(3);
