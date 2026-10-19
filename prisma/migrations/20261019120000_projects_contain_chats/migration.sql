-- Projects become containers of chats (v0 model); conversations move to "Chat".
-- Chats without a project are drafts.

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "starred" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Chat_userId_idx" ON "Chat"("userId");
CREATE INDEX "Chat_projectId_idx" ON "Chat"("projectId");

ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every existing project gets one chat with the same id, titled by its first prompt.
INSERT INTO "Chat" ("id", "title", "userId", "projectId", "createdAt", "updatedAt")
SELECT
    p."id",
    COALESCE(
        (SELECT LEFT(m."content", 60) FROM "Message" m
         WHERE m."projectId" = p."id" AND m."role" = 'USER'
         ORDER BY m."createdAt" ASC LIMIT 1),
        p."name"
    ),
    p."userId",
    p."id",
    p."createdAt",
    p."updatedAt"
FROM "Project" p;

-- Move messages from projects to their chat.
ALTER TABLE "Message" ADD COLUMN "chatId" TEXT;
UPDATE "Message" SET "chatId" = "projectId";
ALTER TABLE "Message" ALTER COLUMN "chatId" SET NOT NULL;

ALTER TABLE "Message" DROP CONSTRAINT "Message_projectId_fkey";
ALTER TABLE "Message" DROP COLUMN "projectId";

CREATE INDEX "Message_chatId_idx" ON "Message"("chatId");
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
