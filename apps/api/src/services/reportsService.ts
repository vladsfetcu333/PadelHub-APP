/**
 * Reports service — 3 thesis-required reports.
 *
 *   1. Player report — own match history, rating evolution, top partners
 *      and opponents, platform percentile, tournament summary.
 *   2. Club report — utilization, active players, level distribution,
 *      weekly match trends. Visible to club owner or admin.
 *   3. Admin report — platform-wide metrics, conversion funnel.
 *
 * All aggregations run against the live Prisma DB. We don't cache —
 * report endpoints are infrequent and a fresh read is cheap at thesis
 * scale. If we ever need to scale this out, swap in a materialised
 * view per report.
 */

import { prisma } from '../lib/prisma.js';
import { toPublicUser } from '../lib/userDto.js';
import { toClubDto } from '../lib/clubDto.js';
import { notFound, forbidden } from '../lib/httpError.js';
import { ratingToLevel } from '../lib/rating/glicko2.js';
import type { PlayerReportDto, ClubReportDto, AdminReportDto } from '@padel/shared';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function daysAgo(d: number): Date {
  return new Date(Date.now() - d * ONE_DAY_MS);
}

function levelBucket(level: number): string {
  // 0.5-wide buckets: "2.0-2.5", "2.5-3.0", ...
  const floor = Math.floor(level * 2) / 2;
  return `${floor.toFixed(1)}-${(floor + 0.5).toFixed(1)}`;
}

function ageBucket(dob: Date): string {
  const years = (Date.now() - dob.getTime()) / (365.25 * ONE_DAY_MS);
  if (years < 18) return '<18';
  if (years < 25) return '18-24';
  if (years < 35) return '25-34';
  if (years < 45) return '35-44';
  if (years < 55) return '45-54';
  return '55+';
}

function isoWeekKey(d: Date): string {
  // YYYY-Www
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNo =
    Math.round(
      ((date.getTime() - week1.getTime()) / ONE_DAY_MS - 3 + ((week1.getDay() + 6) % 7)) / 7,
    ) + 1;
  return `${date.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────
// 1. Player Report
// ─────────────────────────────────────────────────────────────────────

export async function buildPlayerReport(
  userId: string,
  callerId: string,
  callerRole: string,
): Promise<PlayerReportDto> {
  if (userId !== callerId && callerRole !== 'ADMIN') throw forbidden();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('User not found');

  // All validated matches the user played in
  const matches = await prisma.match.findMany({
    where: {
      status: 'VALIDATED',
      OR: [
        { team1Player1Id: userId },
        { team1Player2Id: userId },
        { team2Player1Id: userId },
        { team2Player2Id: userId },
      ],
    },
    include: {
      team1Player1: true,
      team1Player2: true,
      team2Player1: true,
      team2Player2: true,
      club: { include: { courts: true } },
    },
    orderBy: { completedAt: 'asc' },
  });

  // Counters
  const total = matches.length;
  const last30 = matches.filter((m) => m.completedAt && m.completedAt >= daysAgo(30));
  const last90 = matches.filter((m) => m.completedAt && m.completedAt >= daysAgo(90));

  const isWin = (m: (typeof matches)[number]): boolean => {
    const myTeam = m.team1Player1Id === userId || m.team1Player2Id === userId ? 1 : 2;
    return m.winnerTeam === myTeam;
  };
  const wins = matches.filter(isWin).length;
  const winRate = total === 0 ? 0 : (wins / total) * 100;
  const winsLast30 = last30.filter(isWin).length;
  const winRateLast30 = last30.length === 0 ? 0 : (winsLast30 / last30.length) * 100;

  const byMatchType: PlayerReportDto['matches']['byMatchType'] = {};
  for (const m of matches) {
    const k = m.type as 'OPEN_MATCH' | 'TOURNAMENT' | 'FRIENDLY';
    if (!byMatchType[k]) byMatchType[k] = { played: 0, won: 0 };
    byMatchType[k]!.played++;
    if (isWin(m)) byMatchType[k]!.won++;
  }

  // Rating history — reconstruct from ratingChanges audit on each match
  const ratingHistory: Array<{ date: string; rating: number; rd: number }> = [];
  for (const m of matches) {
    if (!m.ratingChanges || !m.completedAt) continue;
    try {
      const changes = JSON.parse(m.ratingChanges) as Record<
        string,
        { after: { rating: number; rd: number } }
      >;
      const change = changes[userId];
      if (change) {
        ratingHistory.push({
          date: m.completedAt.toISOString(),
          rating: change.after.rating,
          rd: change.after.rd,
        });
      }
    } catch {
      /* skip malformed */
    }
  }

  // Clubs visited (top 5)
  const clubCounts = new Map<string, number>();
  const clubInfo = new Map<string, (typeof matches)[number]['club']>();
  for (const m of matches) {
    clubCounts.set(m.clubId, (clubCounts.get(m.clubId) ?? 0) + 1);
    clubInfo.set(m.clubId, m.club);
  }
  const clubsVisited = [...clubCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ club: toClubDto(clubInfo.get(id)!), matchCount: count }));

  // Partner / opponent stats
  const partnerStats = new Map<
    string,
    { played: number; won: number; user: (typeof matches)[number]['team1Player1'] }
  >();
  const opponentStats = new Map<
    string,
    { played: number; won: number; user: (typeof matches)[number]['team1Player1'] }
  >();
  for (const m of matches) {
    const myTeam = m.team1Player1Id === userId || m.team1Player2Id === userId ? 1 : 2;
    const partners =
      myTeam === 1 ? [m.team1Player1, m.team1Player2] : [m.team2Player1, m.team2Player2];
    const opponents =
      myTeam === 1 ? [m.team2Player1, m.team2Player2] : [m.team1Player1, m.team1Player2];
    const won = isWin(m);
    for (const p of partners) {
      if (p.id === userId) continue;
      const cur = partnerStats.get(p.id) ?? { played: 0, won: 0, user: p };
      cur.played++;
      if (won) cur.won++;
      partnerStats.set(p.id, cur);
    }
    for (const p of opponents) {
      const cur = opponentStats.get(p.id) ?? { played: 0, won: 0, user: p };
      cur.played++;
      if (won) cur.won++;
      opponentStats.set(p.id, cur);
    }
  }
  const top5Partners = [...partnerStats.values()]
    .sort((a, b) => b.played - a.played)
    .slice(0, 5)
    .map((s) => ({
      partner: toPublicUser(s.user),
      matchesPlayed: s.played,
      winRate: s.played === 0 ? 0 : (s.won / s.played) * 100,
    }));
  const top5Opponents = [...opponentStats.values()]
    .sort((a, b) => b.played - a.played)
    .slice(0, 5)
    .map((s) => ({
      opponent: toPublicUser(s.user),
      matchesPlayed: s.played,
      winRate: s.played === 0 ? 0 : (s.won / s.played) * 100,
    }));

  // Platform comparison — same-level peers
  const sameLevelLow = Math.max(1, user.padelLevel - 0.5);
  const sameLevelHigh = Math.min(7, user.padelLevel + 0.5);
  const peers = await prisma.user.findMany({
    where: { padelLevel: { gte: sameLevelLow, lte: sameLevelHigh }, isActive: true },
    select: { id: true, padelLevel: true },
  });

  // For each peer compute their match count + win rate (cheap aggregate)
  const peerStats: Array<{ id: string; matches: number; winRate: number }> = [];
  for (const peer of peers) {
    const peerMatches = await prisma.match.count({
      where: {
        status: 'VALIDATED',
        OR: [
          { team1Player1Id: peer.id },
          { team1Player2Id: peer.id },
          { team2Player1Id: peer.id },
          { team2Player2Id: peer.id },
        ],
      },
    });
    // Quick win count: just store match count for percentile; win rate skipped at peer level
    peerStats.push({ id: peer.id, matches: peerMatches, winRate: 0 });
  }
  // Average win rate at same level — we compute exactly for the current user
  // and approximate for peers via avg matches.
  const avgMatchesAtLevel =
    peerStats.reduce((s, p) => s + p.matches, 0) / Math.max(1, peerStats.length);
  // Monthly avg matches
  const memberDays = Math.max(1, (Date.now() - user.createdAt.getTime()) / ONE_DAY_MS);
  const avgMatchesPerMonth = (avgMatchesAtLevel / memberDays) * 30;
  // Percentile by matches played (higher = better-ranked among same-level peers)
  const sortedPeerMatches = peerStats.map((p) => p.matches).sort((a, b) => a - b);
  const myRank = sortedPeerMatches.filter((c) => c < total).length;
  const yourPercentile =
    sortedPeerMatches.length === 0 ? 50 : (myRank / sortedPeerMatches.length) * 100;

  // Tournaments
  const tournamentEntries = await prisma.tournamentPlayer.findMany({
    where: { userId },
    include: { tournament: true },
  });
  const tournamentsParticipated = tournamentEntries.length;
  const tournamentsWon = tournamentEntries.filter((e) => e.finalRank === 1).length;
  const tournamentsPodium = tournamentEntries.filter(
    (e) => e.finalRank != null && e.finalRank <= 3,
  ).length;

  return {
    user: toPublicUser(user),
    matches: {
      total,
      last30Days: last30.length,
      last90Days: last90.length,
      winRate: Math.round(winRate * 10) / 10,
      winRateLast30Days: Math.round(winRateLast30 * 10) / 10,
      byMatchType,
    },
    rating: {
      current: Math.round(user.glickoRating),
      currentLevel: Math.round(ratingToLevel(user.glickoRating) * 10) / 10,
      rd: Math.round(user.glickoRD),
      history: ratingHistory,
    },
    clubs: { visited: clubsVisited },
    partners: { top5: top5Partners },
    opponents: { top5: top5Opponents },
    comparedToPlatform: {
      avgWinRateAtSameLevel: 50, // baseline assumption; properly computing requires per-peer win counts (deferred)
      avgMatchesPlayedPerMonth: Math.round(avgMatchesPerMonth * 10) / 10,
      yourPercentile: Math.round(yourPercentile),
    },
    tournaments: {
      participated: tournamentsParticipated,
      won: tournamentsWon,
      podiumed: tournamentsPodium,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────
// 2. Club Report
// ─────────────────────────────────────────────────────────────────────

export async function buildClubReport(
  clubId: string,
  callerId: string,
  callerRole: string,
  from?: Date,
  to?: Date,
): Promise<ClubReportDto> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: { courts: true },
  });
  if (!club) throw notFound('Club not found');
  if (club.ownerId !== callerId && callerRole !== 'ADMIN') throw forbidden();

  const periodFrom = from ?? daysAgo(30);
  const periodTo = to ?? new Date();

  const matches = await prisma.match.findMany({
    where: {
      clubId,
      status: 'VALIDATED',
      completedAt: { gte: periodFrom, lte: periodTo },
    },
    include: {
      team1Player1: true,
      team1Player2: true,
      team2Player1: true,
      team2Player2: true,
    },
  });

  // Utilization per court — simple proxy: matchesAtCourt / matchesAtClub
  const matchesByCourt = new Map<string | null, number>();
  for (const m of matches) matchesByCourt.set(m.courtId, (matchesByCourt.get(m.courtId) ?? 0) + 1);
  const totalMatches = matches.length;
  const utilizationByDay = club.courts.map((c) => ({
    courtId: c.id,
    courtName: c.name,
    utilization:
      totalMatches === 0
        ? 0
        : Math.round(((matchesByCourt.get(c.id) ?? 0) / totalMatches) * 1000) / 10,
  }));

  // Active players
  const playerSet = new Set<string>();
  for (const m of matches) {
    playerSet.add(m.team1Player1Id);
    playerSet.add(m.team1Player2Id);
    playerSet.add(m.team2Player1Id);
    playerSet.add(m.team2Player2Id);
  }
  const monthly = playerSet.size;

  // Find each player's earliest match here — if it's within the period, they're "new"
  const newSet = new Set<string>();
  const allTimeMatches = await prisma.match.findMany({
    where: { clubId, status: 'VALIDATED' },
    select: {
      team1Player1Id: true,
      team1Player2Id: true,
      team2Player1Id: true,
      team2Player2Id: true,
      completedAt: true,
    },
    orderBy: { completedAt: 'asc' },
  });
  const firstSeen = new Map<string, Date>();
  for (const m of allTimeMatches) {
    if (!m.completedAt) continue;
    for (const id of [m.team1Player1Id, m.team1Player2Id, m.team2Player1Id, m.team2Player2Id]) {
      if (!firstSeen.has(id)) firstSeen.set(id, m.completedAt);
    }
  }
  for (const id of playerSet) {
    const first = firstSeen.get(id);
    if (first && first >= periodFrom) newSet.add(id);
  }
  const newCount = newSet.size;
  const returning = monthly - newCount;

  // Tournaments held in period
  const tournamentsHeld = await prisma.tournament.count({
    where: { clubId, startDate: { gte: periodFrom, lte: periodTo } },
  });

  // Top local players
  const playerCounts = new Map<
    string,
    { matchCount: number; user: (typeof matches)[number]['team1Player1'] }
  >();
  for (const m of matches) {
    for (const u of [m.team1Player1, m.team1Player2, m.team2Player1, m.team2Player2]) {
      const cur = playerCounts.get(u.id) ?? { matchCount: 0, user: u };
      cur.matchCount++;
      playerCounts.set(u.id, cur);
    }
  }
  const topLocalPlayers = [...playerCounts.values()]
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 10)
    .map((s) => ({ user: toPublicUser(s.user), matchCount: s.matchCount }));

  // Level distribution
  const levelMap = new Map<string, number>();
  for (const u of playerCounts.values()) {
    const b = levelBucket(u.user.padelLevel);
    levelMap.set(b, (levelMap.get(b) ?? 0) + 1);
  }
  const levelDistribution = [...levelMap.entries()]
    .sort()
    .map(([levelBucket, count]) => ({ levelBucket, count }));

  // Trends — matches per ISO week
  const byWeek = new Map<string, number>();
  for (const m of matches) {
    if (!m.completedAt) continue;
    const k = isoWeekKey(m.completedAt);
    byWeek.set(k, (byWeek.get(k) ?? 0) + 1);
  }
  const matchesPerWeek = [...byWeek.entries()].sort().map(([week, count]) => ({ week, count }));

  return {
    club: toClubDto(club),
    period: { from: periodFrom.toISOString(), to: periodTo.toISOString() },
    courts: { total: club.courts.length, utilizationByDay },
    activePlayers: { monthly, new: newCount, returning },
    events: { tournamentsHeld, matchesPlayed: totalMatches },
    topLocalPlayers,
    levelDistribution,
    trends: { matchesPerWeek },
  };
}

// ─────────────────────────────────────────────────────────────────────
// 3. Admin Report
// ─────────────────────────────────────────────────────────────────────

export async function buildAdminReport(
  callerRole: string,
  from?: Date,
  to?: Date,
): Promise<AdminReportDto> {
  if (callerRole !== 'ADMIN') throw forbidden();

  const periodFrom = from ?? daysAgo(30);
  const periodTo = to ?? new Date();

  // Users — full table for distributions
  const users = await prisma.user.findMany({ where: { isActive: true } });
  const total = users.length;

  // Active monthly / daily — users with at least one validated match in period
  const last30Matches = await prisma.match.findMany({
    where: { status: 'VALIDATED', completedAt: { gte: daysAgo(30) } },
    select: {
      team1Player1Id: true,
      team1Player2Id: true,
      team2Player1Id: true,
      team2Player2Id: true,
      completedAt: true,
      type: true,
      clubId: true,
    },
  });
  const monthlyActive = new Set<string>();
  const dailyActive = new Set<string>();
  for (const m of last30Matches) {
    for (const id of [m.team1Player1Id, m.team1Player2Id, m.team2Player1Id, m.team2Player2Id]) {
      monthlyActive.add(id);
      if (m.completedAt && m.completedAt >= daysAgo(1)) dailyActive.add(id);
    }
  }

  // New registrations per day in period
  const regsByDay = new Map<string, number>();
  for (const u of users) {
    if (u.createdAt < periodFrom || u.createdAt > periodTo) continue;
    const key = u.createdAt.toISOString().slice(0, 10);
    regsByDay.set(key, (regsByDay.get(key) ?? 0) + 1);
  }
  const newRegistrations = [...regsByDay.entries()]
    .sort()
    .map(([date, count]) => ({ date, count }));

  // Distributions
  const lvlMap = new Map<string, number>();
  const cityMap = new Map<string, number>();
  const genderMap = new Map<string, number>();
  const ageMap = new Map<string, number>();
  for (const u of users) {
    const lb = levelBucket(u.padelLevel);
    lvlMap.set(lb, (lvlMap.get(lb) ?? 0) + 1);
    cityMap.set(u.city, (cityMap.get(u.city) ?? 0) + 1);
    genderMap.set(u.gender, (genderMap.get(u.gender) ?? 0) + 1);
    ageMap.set(ageBucket(u.dateOfBirth), (ageMap.get(ageBucket(u.dateOfBirth)) ?? 0) + 1);
  }
  const levelDistribution = [...lvlMap.entries()]
    .sort()
    .map(([levelBucket, count]) => ({ levelBucket, count }));
  const cityDistribution = [...cityMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([city, count]) => ({ city, count }));
  const genderDistribution = [...genderMap.entries()].map(([gender, count]) => ({ gender, count }));
  const ageDistribution = [...ageMap.entries()]
    .sort()
    .map(([ageBucket, count]) => ({ ageBucket, count }));

  // Matches — total and breakdown
  const allMatches = await prisma.match.findMany({
    where: { status: 'VALIDATED', completedAt: { gte: periodFrom, lte: periodTo } },
    include: { club: true },
  });
  const matchesTotal = allMatches.length;
  const byType: AdminReportDto['matches']['byType'] = {};
  const byClub = new Map<string, { clubName: string; count: number }>();
  for (const m of allMatches) {
    const k = m.type as 'OPEN_MATCH' | 'TOURNAMENT' | 'FRIENDLY';
    byType[k] = (byType[k] ?? 0) + 1;
    const cur = byClub.get(m.clubId) ?? { clubName: m.club.name, count: 0 };
    cur.count++;
    byClub.set(m.clubId, cur);
  }
  const byClubTop = [...byClub.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([clubId, v]) => ({ clubId, clubName: v.clubName, count: v.count }));

  // Tournaments
  const tournaments = await prisma.tournament.findMany({
    where: { startDate: { gte: periodFrom, lte: periodTo } },
  });
  const byFormat: AdminReportDto['tournaments']['byFormat'] = {};
  for (const t of tournaments) {
    byFormat[t.format as 'AMERICANO' | 'MEXICANO' | 'ELIMINATION'] =
      (byFormat[t.format as 'AMERICANO' | 'MEXICANO' | 'ELIMINATION'] ?? 0) + 1;
  }

  // Conversion funnel
  const completedProfile = users.filter((u) => u.bio || u.avatarUrl || u.playStyle != null).length;
  const playerMatchCount = new Map<string, number>();
  for (const m of last30Matches) {
    for (const id of [m.team1Player1Id, m.team1Player2Id, m.team2Player1Id, m.team2Player2Id]) {
      playerMatchCount.set(id, (playerMatchCount.get(id) ?? 0) + 1);
    }
  }
  const firstMatchPlayed = [...playerMatchCount.entries()].filter(([, c]) => c >= 1).length;
  const secondMatchPlayed = [...playerMatchCount.entries()].filter(([, c]) => c >= 2).length;

  return {
    period: { from: periodFrom.toISOString(), to: periodTo.toISOString() },
    users: {
      total,
      activeMonthly: monthlyActive.size,
      activeDaily: dailyActive.size,
      newRegistrations,
      levelDistribution,
      cityDistribution,
      genderDistribution,
      ageDistribution,
    },
    matches: {
      total: matchesTotal,
      byType,
      byClub: byClubTop,
    },
    tournaments: {
      total: tournaments.length,
      byFormat,
    },
    conversionFunnel: {
      registered: total,
      completedProfile,
      firstMatchPlayed,
      secondMatchPlayed,
      activeUsers: monthlyActive.size,
    },
  };
}
