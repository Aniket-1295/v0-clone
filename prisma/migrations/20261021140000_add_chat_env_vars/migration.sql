-- CreateTable
CREATE TABLE "ChatEnvVar" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueEncrypted" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "chatId" TEXT NOT NULL,

    CONSTRAINT "ChatEnvVar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatEnvVar_chatId_key_key" ON "ChatEnvVar"("chatId", "key");

-- AddForeignKey
ALTER TABLE "ChatEnvVar" ADD CONSTRAINT "ChatEnvVar_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
