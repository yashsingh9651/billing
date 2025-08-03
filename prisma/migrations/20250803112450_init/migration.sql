/*
  Warnings:

  - You are about to drop the column `status` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `supplier` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Invoice" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "public"."Product" DROP COLUMN "description",
DROP COLUMN "isActive",
DROP COLUMN "supplier";
