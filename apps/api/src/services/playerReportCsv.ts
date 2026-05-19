/**
 * Player-report CSV exporter.
 *
 * Calls the existing buildPlayerReport (which enforces the
 * "self-or-admin" authorization rule) and projects the nested DTO into
 * a flat, multi-section CSV that opens cleanly in Excel / Google Sheets
 * / LibreOffice. UTF-8 BOM is prepended in `buildCsv` so Excel on
 * Windows renders Romanian diacritics correctly.
 *
 * The CSV layout matches the thesis-advisor spec (see PHASE5 plan):
 *
 *     # PadelHub — Statistici jucător
 *     # Generat: 2026-05-19 14:32
 *     # Jucător: andrei_pop (Andrei Pop)
 *
 *     ## Sumar
 *     Câmp,Valoare
 *     Total meciuri,47
 *     ...
 *
 *     ## Meciuri pe tip
 *     ...
 */
import { buildPlayerReport } from './reportsService.js';
import { buildCsv, csvComment, csvSection, CSV_BLANK_ROW } from '../lib/csv.js';

export interface PlayerCsvExport {
  filename: string;
  body: string;
}

const MATCH_TYPE_LABEL_RO: Record<string, string> = {
  OPEN_MATCH: 'Meci deschis',
  TOURNAMENT: 'Turneu',
  FRIENDLY: 'Amical',
};

function fmtTimestamp(d = new Date()): string {
  // YYYY-MM-DD HH:mm in local time — readable header for the file
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function fmtDateOnly(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtPercent(value: number): string {
  // The reports service emits percentages already in [0..100] range, not
  // fractions. We render with one decimal + the % suffix so the cell is
  // unambiguous when opened in Excel ("50.0%" not "50.000").
  return `${value.toFixed(1)}%`;
}

/**
 * Build the CSV body and recommended filename for a player.
 * Authorization is delegated to buildPlayerReport (throws forbidden /
 * notFound as appropriate) — the route handler propagates that.
 */
export async function buildPlayerReportCsv(
  userId: string,
  callerId: string,
  callerRole: string,
): Promise<PlayerCsvExport> {
  const report = await buildPlayerReport(userId, callerId, callerRole);

  const u = report.user;
  const fullName = `${u.firstName} ${u.lastName}`.trim();
  const rows: Array<ReadonlyArray<unknown>> = [];

  // Header comments — explanatory, not data.
  rows.push(csvComment('PadelHub — Statistici jucător'));
  rows.push(csvComment(`Generat: ${fmtTimestamp()}`));
  rows.push(csvComment(`Jucător: ${u.username} (${fullName})`));
  rows.push(CSV_BLANK_ROW);

  // ── Sumar ────────────────────────────────────────────────────────
  rows.push(csvSection('Sumar'));
  rows.push(['Câmp', 'Valoare']);
  rows.push(['Total meciuri', report.matches.total]);
  rows.push(['Meciuri (ultimele 30 zile)', report.matches.last30Days]);
  rows.push(['Meciuri (ultimele 90 zile)', report.matches.last90Days]);
  rows.push(['Win rate', fmtPercent(report.matches.winRate)]);
  rows.push(['Win rate (30 zile)', fmtPercent(report.matches.winRateLast30Days)]);
  rows.push(['Rating curent', Math.round(report.rating.current)]);
  rows.push(['RD', Math.round(report.rating.rd)]);
  rows.push(['Nivel calculat', report.rating.currentLevel.toFixed(1)]);
  rows.push(['Turnee participate', report.tournaments.participated]);
  rows.push(['Turnee câștigate', report.tournaments.won]);
  rows.push(['Locuri pe podium', report.tournaments.podiumed]);
  rows.push(['Percentilă pe platformă', fmtPercent(report.comparedToPlatform.yourPercentile)]);
  rows.push([
    'Meciuri/lună mediu pe platformă',
    report.comparedToPlatform.avgMatchesPlayedPerMonth.toFixed(2),
  ]);
  rows.push(CSV_BLANK_ROW);

  // ── Meciuri pe tip ───────────────────────────────────────────────
  rows.push(csvSection('Meciuri pe tip'));
  rows.push(['Tip', 'Jucate', 'Câștigate']);
  for (const [key, agg] of Object.entries(report.matches.byMatchType)) {
    if (!agg) continue;
    rows.push([MATCH_TYPE_LABEL_RO[key] ?? key, agg.played, agg.won]);
  }
  rows.push(CSV_BLANK_ROW);

  // ── Top parteneri ────────────────────────────────────────────────
  rows.push(csvSection(`Top ${report.partners.top5.length} parteneri`));
  rows.push(['Username', 'Nume', 'Meciuri', 'Win rate']);
  for (const row of report.partners.top5) {
    const p = row.partner;
    rows.push([
      p.username,
      `${p.firstName} ${p.lastName}`.trim(),
      row.matchesPlayed,
      fmtPercent(row.winRate),
    ]);
  }
  rows.push(CSV_BLANK_ROW);

  // ── Top adversari ────────────────────────────────────────────────
  rows.push(csvSection(`Top ${report.opponents.top5.length} adversari`));
  rows.push(['Username', 'Nume', 'Meciuri', 'Win rate']);
  for (const row of report.opponents.top5) {
    const o = row.opponent;
    rows.push([
      o.username,
      `${o.firstName} ${o.lastName}`.trim(),
      row.matchesPlayed,
      fmtPercent(row.winRate),
    ]);
  }
  rows.push(CSV_BLANK_ROW);

  // ── Top cluburi ──────────────────────────────────────────────────
  rows.push(csvSection(`Top ${report.clubs.visited.length} cluburi`));
  rows.push(['Club', 'Oraș', 'Meciuri']);
  for (const row of report.clubs.visited) {
    rows.push([row.club.name, row.club.city, row.matchCount]);
  }
  rows.push(CSV_BLANK_ROW);

  // ── Istoric rating (ultimele 30 puncte) ─────────────────────────
  const history = report.rating.history.slice(-30);
  rows.push(csvSection(`Istoric rating (ultimele ${history.length} puncte)`));
  rows.push(['Data', 'Rating', 'RD', 'Delta']);
  let prev: number | null = null;
  for (const point of history) {
    const delta =
      prev === null ? '' : (point.rating - prev > 0 ? '+' : '') + Math.round(point.rating - prev);
    rows.push([point.date.slice(0, 10), Math.round(point.rating), Math.round(point.rd), delta]);
    prev = point.rating;
  }

  return {
    filename: `padelhub-stats-${u.username}-${fmtDateOnly()}.csv`,
    body: buildCsv(rows),
  };
}
