-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('audio', 'video', 'image');

-- AlterTable
ALTER TABLE "Song" ADD COLUMN     "type" "MediaType" NOT NULL DEFAULT 'audio';

-- Rename table and update foreign key constraints
ALTER TABLE "Song" RENAME TO "Media";

-- Update Comment table to reference Media instead of Song
ALTER TABLE "Comment" RENAME COLUMN "songId" TO "mediaId";

-- Drop old foreign key constraint
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_songId_fkey";

-- Add new foreign key constraint
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add User table and related structures
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Create unique index on username
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Create Band table
CREATE TABLE "Band" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Band_pkey" PRIMARY KEY ("id")
);

-- Create UserBand junction table
CREATE TABLE "UserBand" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "bandId" INTEGER NOT NULL,

    CONSTRAINT "UserBand_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on UserBand
CREATE UNIQUE INDEX "UserBand_userId_bandId_key" ON "UserBand"("userId", "bandId");

-- Create ApiKey table
CREATE TABLE "ApiKey" (
    "id" SERIAL NOT NULL,
    "keyHash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- Create Session table
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- Create unique index on sessionId
CREATE UNIQUE INDEX "Session_sessionId_key" ON "Session"("sessionId");

-- Update Project table to add new columns
ALTER TABLE "Project" ADD COLUMN     "bandId" INTEGER;
ALTER TABLE "Project" ADD COLUMN     "ownerId" INTEGER NOT NULL DEFAULT 1;

-- Update Comment table to add userId
ALTER TABLE "Comment" ADD COLUMN     "userId" INTEGER NOT NULL DEFAULT 1;

-- Add foreign key constraints
ALTER TABLE "UserBand" ADD CONSTRAINT "UserBand_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserBand" ADD CONSTRAINT "UserBand_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Remove old Project columns that are no longer needed
ALTER TABLE "Project" DROP COLUMN "bandName";
ALTER TABLE "Project" DROP COLUMN "owner";