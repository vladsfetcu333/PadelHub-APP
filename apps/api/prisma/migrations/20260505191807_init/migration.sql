-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
    "gender" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "bio" TEXT,
    "padelLevel" REAL NOT NULL DEFAULT 3.0,
    "preferredSide" TEXT NOT NULL,
    "dominantHand" TEXT NOT NULL,
    "playStyle" TEXT,
    "playFrequency" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "glickoRating" REAL NOT NULL DEFAULT 1500,
    "glickoRD" REAL NOT NULL DEFAULT 350,
    "glickoVolatility" REAL NOT NULL DEFAULT 0.06,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "isCoach" BOOLEAN NOT NULL DEFAULT false,
    "coachCertifications" TEXT,
    "prefMaxLevelDiff" REAL,
    "prefGenderFilter" TEXT NOT NULL DEFAULT 'ANY',
    "prefAgeMin" INTEGER,
    "prefAgeMax" INTEGER,
    "prefRequireGoalMatch" BOOLEAN NOT NULL DEFAULT false,
    "notifyByEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyInApp" BOOLEAN NOT NULL DEFAULT true,
    "profileVisibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    CONSTRAINT "Availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Club_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Court" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "surface" TEXT,
    "pricePerHour" REAL,
    "pricePerHourPeak" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Court_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserFavoriteClub" (
    "userId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "clubId"),
    CONSTRAINT "UserFavoriteClub_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserFavoriteClub_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
