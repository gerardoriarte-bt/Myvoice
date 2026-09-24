-- DropForeignKey
ALTER TABLE "PiezaEvento" DROP CONSTRAINT "PiezaEvento_autorId_fkey";

-- AlterTable
ALTER TABLE "PiezaEvento" ADD COLUMN     "autorExterno" TEXT,
ALTER COLUMN "autorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PiezaEvento" ADD CONSTRAINT "PiezaEvento_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
