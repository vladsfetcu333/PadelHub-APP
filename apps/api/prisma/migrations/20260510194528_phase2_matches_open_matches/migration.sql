-- CreateTable
CREATE TABLE "OpenMatchPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creatorId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 90,
    "levelMin" REAL,
    "levelMax" REAL,
    "sideNeeded" TEXT,
    "genderRequired" TEXT NOT NULL DEFAULT 'ANY',
    "goalRequired" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OpenMatchPost_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OpenMatchPost_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OpenMatchParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "openMatchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpenMatchParticipant_openMatchId_fkey" FOREIGN KEY ("openMatchId") REFERENCES "OpenMatchPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OpenMatchParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "openMatchId" TEXT,
    "tournamentMatchId" TEXT,
    "team1Player1Id" TEXT NOT NULL,
    "team1Player2Id" TEXT NOT NULL,
    "team2Player1Id" TEXT NOT NULL,
    "team2Player2Id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "courtId" TEXT,
    "scheduledAt" DATETIME NOT NULL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scoreSets" TEXT,
    "winnerTeam" INTEGER,
    "scoreEnteredAt" DATETIME,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_openMatchId_fkey" FOREIGN KEY ("openMatchId") REFERENCES "OpenMatchPost" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_team1Player1Id_fkey" FOREIGN KEY ("team1Player1Id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_team1Player2Id_fkey" FOREIGN KEY ("team1Player2Id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_team2Player1Id_fkey" FOREIGN KEY ("team2Player1Id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_team2Player2Id_fkey" FOREIGN KEY ("team2Player2Id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
