-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "PreferredSide" AS ENUM ('LEFT', 'RIGHT', 'BOTH');

-- CreateEnum
CREATE TYPE "DominantHand" AS ENUM ('LEFT', 'RIGHT');

-- CreateEnum
CREATE TYPE "PlayStyle" AS ENUM ('DEFENSIVE', 'OFFENSIVE', 'BALANCED', 'BUILDER');

-- CreateEnum
CREATE TYPE "PlayFrequency" AS ENUM ('ONCE_WEEK', 'TWO_THREE_WEEK', 'FOUR_PLUS_WEEK');

-- CreateEnum
CREATE TYPE "PlayerGoal" AS ENUM ('RECREATIONAL', 'COMPETITIVE', 'MIXED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'COACH', 'CLUB_OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "GenderFilter" AS ENUM ('ANY', 'MALE_ONLY', 'FEMALE_ONLY');

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'FRIENDS_ONLY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "CourtType" AS ENUM ('PANORAMIC', 'TRADITIONAL', 'SINGLE_PADEL');

-- CreateEnum
CREATE TYPE "CourtLocation" AS ENUM ('INDOOR', 'OUTDOOR');

-- CreateEnum
CREATE TYPE "OpenMatchStatus" AS ENUM ('OPEN', 'FULL', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('OPEN_MATCH', 'TOURNAMENT', 'FRIENDLY');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'PENDING_CONFIRMATION', 'VALIDATED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TournamentFormat" AS ENUM ('AMERICANO', 'MEXICANO', 'ELIMINATION');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'REGISTRATION', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AmericanoPairingMode" AS ENUM ('ROTATION', 'BALANCED', 'TOP_TOGETHER', 'RANDOM');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MATCH_RECOMMENDATION', 'MATCH_INVITATION', 'MATCH_SCHEDULED', 'MATCH_SCORE_PENDING', 'RATING_UPDATED', 'TOURNAMENT_INVITATION', 'TOURNAMENT_STARTING', 'TOURNAMENT_COMPLETED', 'CLUB_VERIFIED', 'WELCOME', 'GENERIC');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "city" TEXT NOT NULL,
    "bio" TEXT,
    "padelLevel" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "preferredSide" "PreferredSide" NOT NULL,
    "dominantHand" "DominantHand" NOT NULL,
    "playStyle" "PlayStyle",
    "playFrequency" "PlayFrequency" NOT NULL,
    "goal" "PlayerGoal" NOT NULL,
    "glickoRating" DOUBLE PRECISION NOT NULL DEFAULT 1500,
    "glickoRD" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "glickoVolatility" DOUBLE PRECISION NOT NULL DEFAULT 0.06,
    "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
    "isCoach" BOOLEAN NOT NULL DEFAULT false,
    "coachCertifications" TEXT,
    "prefMaxLevelDiff" DOUBLE PRECISION,
    "prefGenderFilter" "GenderFilter" NOT NULL DEFAULT 'ANY',
    "prefAgeMin" INTEGER,
    "prefAgeMax" INTEGER,
    "prefRequireGoalMatch" BOOLEAN NOT NULL DEFAULT false,
    "notifyByEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyInApp" BOOLEAN NOT NULL DEFAULT true,
    "profileVisibility" "ProfileVisibility" NOT NULL DEFAULT 'PUBLIC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "photos" TEXT NOT NULL DEFAULT '[]',
    "hasLockerRoom" BOOLEAN NOT NULL DEFAULT false,
    "hasShowers" BOOLEAN NOT NULL DEFAULT false,
    "hasCafe" BOOLEAN NOT NULL DEFAULT false,
    "hasParking" BOOLEAN NOT NULL DEFAULT false,
    "hasShop" BOOLEAN NOT NULL DEFAULT false,
    "hasSchool" BOOLEAN NOT NULL DEFAULT false,
    "hasRacketRental" BOOLEAN NOT NULL DEFAULT false,
    "businessHours" TEXT NOT NULL DEFAULT '{}',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Court" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CourtType" NOT NULL,
    "location" "CourtLocation" NOT NULL,
    "surface" TEXT,
    "pricePerHour" DOUBLE PRECISION,
    "pricePerHourPeak" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Court_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFavoriteClub" (
    "userId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavoriteClub_pkey" PRIMARY KEY ("userId","clubId")
);

-- CreateTable
CREATE TABLE "OpenMatchPost" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 90,
    "levelMin" DOUBLE PRECISION,
    "levelMax" DOUBLE PRECISION,
    "sideNeeded" "PreferredSide",
    "genderRequired" "GenderFilter" NOT NULL DEFAULT 'ANY',
    "goalRequired" "PlayerGoal",
    "notes" TEXT,
    "status" "OpenMatchStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenMatchPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenMatchParticipant" (
    "id" TEXT NOT NULL,
    "openMatchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpenMatchParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "type" "MatchType" NOT NULL,
    "openMatchId" TEXT,
    "tournamentMatchId" TEXT,
    "team1Player1Id" TEXT NOT NULL,
    "team1Player2Id" TEXT NOT NULL,
    "team2Player1Id" TEXT NOT NULL,
    "team2Player2Id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "courtId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scoreSets" TEXT,
    "winnerTeam" INTEGER,
    "scoreEnteredAt" TIMESTAMP(3),
    "scoreEnteredBy" TEXT,
    "confirmedT1P1" BOOLEAN NOT NULL DEFAULT false,
    "confirmedT1P2" BOOLEAN NOT NULL DEFAULT false,
    "confirmedT2P1" BOOLEAN NOT NULL DEFAULT false,
    "confirmedT2P2" BOOLEAN NOT NULL DEFAULT false,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "ratingApplied" BOOLEAN NOT NULL DEFAULT false,
    "ratingChanges" TEXT,
    "isDisputed" BOOLEAN NOT NULL DEFAULT false,
    "disputeReason" TEXT,
    "disputeRaisedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "format" "TournamentFormat" NOT NULL,
    "clubId" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "maxPlayers" INTEGER NOT NULL,
    "numberOfRounds" INTEGER,
    "pointsPerGame" INTEGER NOT NULL DEFAULT 1,
    "matchDurationMinutes" INTEGER NOT NULL DEFAULT 20,
    "numberOfCourts" INTEGER NOT NULL DEFAULT 1,
    "pairingMode" "AmericanoPairingMode" NOT NULL DEFAULT 'ROTATION',
    "winPoints" INTEGER NOT NULL DEFAULT 3,
    "drawPoints" INTEGER NOT NULL DEFAULT 1,
    "lossPoints" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "minLevel" DOUBLE PRECISION,
    "maxLevel" DOUBLE PRECISION,
    "entryFee" DOUBLE PRECISION,
    "allowGuests" BOOLEAN NOT NULL DEFAULT true,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentPlayer" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "guestLevel" DOUBLE PRECISION,
    "seed" INTEGER,
    "totalGamesWon" INTEGER NOT NULL DEFAULT 0,
    "totalGamesLost" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "finalRank" INTEGER,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentRound" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TournamentRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentMatch" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "courtNumber" INTEGER,
    "team1Player1Id" TEXT NOT NULL,
    "team1Player2Id" TEXT NOT NULL,
    "team2Player1Id" TEXT NOT NULL,
    "team2Player2Id" TEXT NOT NULL,
    "team1Score" INTEGER,
    "team2Score" INTEGER,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "generalMatchId" TEXT,

    CONSTRAINT "TournamentMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "actionUrl" TEXT,
    "metadata" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(384) NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "contextChunkIds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Availability_userId_idx" ON "Availability"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");

-- CreateIndex
CREATE INDEX "Club_city_idx" ON "Club"("city");

-- CreateIndex
CREATE INDEX "Club_latitude_longitude_idx" ON "Club"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Court_clubId_idx" ON "Court"("clubId");

-- CreateIndex
CREATE INDEX "OpenMatchPost_scheduledAt_idx" ON "OpenMatchPost"("scheduledAt");

-- CreateIndex
CREATE INDEX "OpenMatchPost_clubId_idx" ON "OpenMatchPost"("clubId");

-- CreateIndex
CREATE INDEX "OpenMatchPost_status_idx" ON "OpenMatchPost"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OpenMatchParticipant_openMatchId_userId_key" ON "OpenMatchParticipant"("openMatchId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_openMatchId_key" ON "Match"("openMatchId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_tournamentMatchId_key" ON "Match"("tournamentMatchId");

-- CreateIndex
CREATE INDEX "Match_scheduledAt_idx" ON "Match"("scheduledAt");

-- CreateIndex
CREATE INDEX "Match_clubId_idx" ON "Match"("clubId");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "Tournament_startDate_idx" ON "Tournament"("startDate");

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- CreateIndex
CREATE INDEX "Tournament_clubId_idx" ON "Tournament"("clubId");

-- CreateIndex
CREATE INDEX "TournamentPlayer_tournamentId_idx" ON "TournamentPlayer"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPlayer_tournamentId_userId_key" ON "TournamentPlayer"("tournamentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRound_tournamentId_roundNumber_key" ON "TournamentRound"("tournamentId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentMatch_generalMatchId_key" ON "TournamentMatch"("generalMatchId");

-- CreateIndex
CREATE INDEX "TournamentMatch_roundId_idx" ON "TournamentMatch"("roundId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeChunk_contentHash_key" ON "KnowledgeChunk"("contentHash");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_source_idx" ON "KnowledgeChunk"("source");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_category_idx" ON "KnowledgeChunk"("category");

-- CreateIndex
CREATE INDEX "ChatSession_userId_idx" ON "ChatSession"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Court" ADD CONSTRAINT "Court_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteClub" ADD CONSTRAINT "UserFavoriteClub_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteClub" ADD CONSTRAINT "UserFavoriteClub_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenMatchPost" ADD CONSTRAINT "OpenMatchPost_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenMatchPost" ADD CONSTRAINT "OpenMatchPost_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenMatchParticipant" ADD CONSTRAINT "OpenMatchParticipant_openMatchId_fkey" FOREIGN KEY ("openMatchId") REFERENCES "OpenMatchPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenMatchParticipant" ADD CONSTRAINT "OpenMatchParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_openMatchId_fkey" FOREIGN KEY ("openMatchId") REFERENCES "OpenMatchPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_team1Player1Id_fkey" FOREIGN KEY ("team1Player1Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_team1Player2Id_fkey" FOREIGN KEY ("team1Player2Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_team2Player1Id_fkey" FOREIGN KEY ("team2Player1Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_team2Player2Id_fkey" FOREIGN KEY ("team2Player2Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRound" ADD CONSTRAINT "TournamentRound_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "TournamentRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_team1Player1Id_fkey" FOREIGN KEY ("team1Player1Id") REFERENCES "TournamentPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_team1Player2Id_fkey" FOREIGN KEY ("team1Player2Id") REFERENCES "TournamentPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_team2Player1Id_fkey" FOREIGN KEY ("team2Player1Id") REFERENCES "TournamentPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_team2Player2Id_fkey" FOREIGN KEY ("team2Player2Id") REFERENCES "TournamentPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Approximate-nearest-neighbour index for fast cosine similarity search
-- on knowledge chunks. HNSW (Hierarchical Navigable Small World) is the
-- recommended pgvector index for sub-millisecond top-K queries. Use the
-- cosine ops class because we L2-normalise embeddings at ingest time.
CREATE INDEX "KnowledgeChunk_embedding_hnsw_idx"
  ON "KnowledgeChunk"
  USING hnsw ("embedding" vector_cosine_ops);
