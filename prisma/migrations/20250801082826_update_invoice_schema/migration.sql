/*
  Warnings:

  - You are about to drop the column `gstAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `igstAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `sgstAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmountInWords` on the `Invoice` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Invoice" DROP COLUMN "gstAmount",
DROP COLUMN "igstAmount",
DROP COLUMN "sgstAmount",
DROP COLUMN "totalAmount",
DROP COLUMN "totalAmountInWords",
ADD COLUMN     "cgstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "igstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "sgstRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
