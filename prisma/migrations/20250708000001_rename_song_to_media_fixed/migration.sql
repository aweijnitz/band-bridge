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