-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "publishDeploymentId" TEXT,
ADD COLUMN     "publishError" TEXT,
ADD COLUMN     "publishStatus" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "publishedFragmentId" TEXT,
ADD COLUMN     "publishedUrl" TEXT,
ADD COLUMN     "vercelProjectName" TEXT;
