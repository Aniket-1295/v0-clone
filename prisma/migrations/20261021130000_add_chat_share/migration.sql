-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "shareId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Chat_shareId_key" ON "Chat"("shareId");
