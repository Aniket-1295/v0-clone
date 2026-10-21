-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "githubBranch" TEXT,
ADD COLUMN     "githubPushedAt" TIMESTAMP(3),
ADD COLUMN     "githubPushedFragmentId" TEXT,
ADD COLUMN     "githubRepo" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "githubLogin" TEXT,
ADD COLUMN     "githubTokenEncrypted" TEXT;
