/**
 * Demo seed for the thesis-defense deployment.
 *
 * Populates the database with realistic data: ~60 players, 18 clubs,
 * ~400 historical matches with chronological Glicko-2 runs (so rating
 * curves look real), 8 tournaments across statuses, ~15 open matches
 * in various states, notifications, and sample chat sessions.
 *
 * Determinism: the faker seed is fixed (faker.seed(20260513)) so reruns
 * produce identical output. The script wipes the relevant tables first
 * so it can run idempotently against a populated DB.
 *
 * Run:  npm run db:seed:demo -w apps/api
 */

import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import slugify from 'slugify';
import { faker } from '@faker-js/faker';

import {
  updateDoublesMatch,
  initialRatingFromLevel,
  type Rating,
} from '../src/lib/rating/glicko2.js';

const prisma = new PrismaClient();
faker.seed(20260513);
const hash = (s: string) => bcrypt.hash(s, 10);
const slug = (s: string) => slugify(s, { lower: true, strict: true });

// ─────────────────────────────────────────────────────────────────────
// Reference data
// ─────────────────────────────────────────────────────────────────────

const MALE_FIRST = [
  'Andrei',
  'Alexandru',
  'Mihai',
  'Cristian',
  'Bogdan',
  'Radu',
  'Vlad',
  'Marius',
  'Sorin',
  'Razvan',
  'Tudor',
  'Stefan',
  'Florin',
  'Adrian',
  'Cosmin',
  'Dragos',
  'Ionut',
  'George',
  'Daniel',
  'Catalin',
  'Ovidiu',
  'Sebastian',
  'Robert',
  'Iulian',
  'Paul',
  'Gabriel',
  'Alin',
  'Dorin',
  'Lucian',
  'Octavian',
  'Silviu',
  'Valentin',
];
const FEMALE_FIRST = [
  'Maria',
  'Ioana',
  'Elena',
  'Andreea',
  'Alexandra',
  'Cristina',
  'Diana',
  'Mihaela',
  'Ana',
  'Roxana',
  'Raluca',
  'Bianca',
  'Adina',
  'Larisa',
  'Daniela',
  'Gabriela',
  'Iulia',
  'Simona',
  'Stefania',
  'Teodora',
  'Oana',
  'Monica',
  'Roberta',
  'Sabina',
  'Carmen',
  'Anca',
];
const LAST_NAMES = [
  'Popescu',
  'Ionescu',
  'Popa',
  'Stoica',
  'Stan',
  'Constantin',
  'Dumitrescu',
  'Marin',
  'Dinu',
  'Radu',
  'Iordache',
  'Vasile',
  'Tudor',
  'Gheorghe',
  'Mihai',
  'Mocanu',
  'Ene',
  'Rusu',
  'Iliescu',
  'Pavel',
  'Cojocaru',
  'Manea',
  'Florea',
  'Sandu',
  'Bratu',
  'Neagu',
  'Diaconu',
  'Lazar',
  'Toma',
  'Anton',
  'Pop',
  'Munteanu',
  'Petrescu',
  'Tanase',
];
const CITIES_WEIGHTED: Array<[string, number]> = [
  ['București', 60],
  ['Cluj-Napoca', 10],
  ['Brașov', 6],
  ['Timișoara', 6],
  ['Iași', 5],
  ['Constanța', 4],
  ['Sibiu', 3],
  ['Oradea', 3],
  ['Craiova', 3],
];

interface ClubTemplate {
  name: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  description?: string;
  facilities?: Partial<
    Record<
      | 'hasLockerRoom'
      | 'hasShowers'
      | 'hasCafe'
      | 'hasParking'
      | 'hasShop'
      | 'hasSchool'
      | 'hasRacketRental',
      boolean
    >
  >;
  courtsConfig: Array<{
    name: string;
    type: 'PANORAMIC' | 'TRADITIONAL' | 'SINGLE_PADEL';
    location: 'INDOOR' | 'OUTDOOR';
    surface?: string;
    price?: number;
    pricePeak?: number;
  }>;
}

const CLUBS: ClubTemplate[] = [
  {
    name: 'Padel Club Băneasa',
    city: 'București',
    address: 'Șoseaua București-Ploiești 42A, București',
    latitude: 44.5101,
    longitude: 26.0833,
    description: 'Club premier cu 4 terenuri panoramice și școală pentru juniori.',
    facilities: {
      hasLockerRoom: true,
      hasShowers: true,
      hasCafe: true,
      hasParking: true,
      hasSchool: true,
      hasRacketRental: true,
    },
    courtsConfig: [
      {
        name: 'Teren 1',
        type: 'PANORAMIC',
        location: 'INDOOR',
        surface: 'Iarbă sintetică',
        price: 90,
        pricePeak: 120,
      },
      {
        name: 'Teren 2',
        type: 'PANORAMIC',
        location: 'INDOOR',
        surface: 'Iarbă sintetică',
        price: 90,
        pricePeak: 120,
      },
      {
        name: 'Teren 3',
        type: 'TRADITIONAL',
        location: 'OUTDOOR',
        surface: 'Iarbă sintetică',
        price: 80,
        pricePeak: 100,
      },
      {
        name: 'Teren 4',
        type: 'TRADITIONAL',
        location: 'OUTDOOR',
        surface: 'Iarbă sintetică',
        price: 80,
        pricePeak: 100,
      },
    ],
  },
  {
    name: 'Padel Pipera',
    city: 'București',
    address: 'Bd. Pipera 25, Voluntari',
    latitude: 44.4923,
    longitude: 26.1265,
    description: 'Două terenuri acoperite, perfect pentru jocul tot anul.',
    facilities: { hasLockerRoom: true, hasShowers: true, hasParking: true, hasRacketRental: true },
    courtsConfig: [
      { name: 'Central', type: 'PANORAMIC', location: 'INDOOR', price: 100, pricePeak: 130 },
      { name: 'Court 2', type: 'TRADITIONAL', location: 'INDOOR', price: 90, pricePeak: 120 },
    ],
  },
  {
    name: 'Padel Park Herăstrău',
    city: 'București',
    address: 'Șoseaua Nordului 28, București',
    latitude: 44.4794,
    longitude: 26.0876,
    description: 'Club outdoor lângă parcul Herăstrău, cu cafenea premiată.',
    facilities: { hasLockerRoom: true, hasShowers: true, hasCafe: true, hasParking: true },
    courtsConfig: [
      { name: 'Teren 1', type: 'PANORAMIC', location: 'OUTDOOR', price: 75, pricePeak: 95 },
      { name: 'Teren 2', type: 'TRADITIONAL', location: 'OUTDOOR', price: 70, pricePeak: 90 },
      { name: 'Teren 3', type: 'TRADITIONAL', location: 'OUTDOOR', price: 70, pricePeak: 90 },
    ],
  },
  {
    name: 'Padel Arena Floreasca',
    city: 'București',
    address: 'Calea Floreasca 169, București',
    latitude: 44.4673,
    longitude: 26.0959,
    description: 'Arena modernă în Floreasca, 4 terenuri și școală pentru copii.',
    facilities: {
      hasLockerRoom: true,
      hasShowers: true,
      hasCafe: true,
      hasParking: true,
      hasSchool: true,
      hasRacketRental: true,
    },
    courtsConfig: [
      { name: 'Teren 1', type: 'PANORAMIC', location: 'INDOOR', price: 100, pricePeak: 130 },
      { name: 'Teren 2', type: 'PANORAMIC', location: 'INDOOR', price: 100, pricePeak: 130 },
      { name: 'Teren 3', type: 'TRADITIONAL', location: 'INDOOR', price: 90, pricePeak: 120 },
      { name: 'Teren 4', type: 'TRADITIONAL', location: 'INDOOR', price: 90, pricePeak: 120 },
    ],
  },
  {
    name: 'Padel Aviatorilor',
    city: 'București',
    address: 'Bd. Aviatorilor 86, București',
    latitude: 44.4731,
    longitude: 26.0867,
    facilities: { hasLockerRoom: true, hasShowers: true, hasCafe: true },
    courtsConfig: [
      { name: 'Court 1', type: 'PANORAMIC', location: 'INDOOR', price: 95, pricePeak: 125 },
      { name: 'Court 2', type: 'TRADITIONAL', location: 'OUTDOOR', price: 70, pricePeak: 90 },
    ],
  },
  {
    name: 'Padel Berceni',
    city: 'București',
    address: 'Șoseaua Berceni 110, București',
    latitude: 44.3886,
    longitude: 26.1336,
    facilities: { hasLockerRoom: true, hasShowers: true, hasParking: true },
    courtsConfig: [
      { name: 'Teren 1', type: 'TRADITIONAL', location: 'OUTDOOR', price: 65, pricePeak: 85 },
      { name: 'Teren 2', type: 'TRADITIONAL', location: 'OUTDOOR', price: 65, pricePeak: 85 },
      { name: 'Teren 3', type: 'PANORAMIC', location: 'INDOOR', price: 90, pricePeak: 115 },
    ],
  },
  {
    name: 'Padel Drumul Taberei',
    city: 'București',
    address: 'Drumul Taberei 90, București',
    latitude: 44.4218,
    longitude: 26.0292,
    facilities: { hasLockerRoom: true, hasShowers: true, hasParking: true, hasRacketRental: true },
    courtsConfig: [
      { name: 'Teren 1', type: 'PANORAMIC', location: 'INDOOR', price: 85, pricePeak: 110 },
      { name: 'Teren 2', type: 'TRADITIONAL', location: 'OUTDOOR', price: 70, pricePeak: 90 },
    ],
  },
  {
    name: 'Padel Otopeni',
    city: 'București',
    address: 'Calea Bucureștilor 305, Otopeni',
    latitude: 44.5677,
    longitude: 26.0808,
    facilities: { hasLockerRoom: true, hasShowers: true, hasParking: true, hasCafe: true },
    courtsConfig: [
      { name: 'Teren 1', type: 'PANORAMIC', location: 'INDOOR', price: 95, pricePeak: 125 },
      { name: 'Teren 2', type: 'PANORAMIC', location: 'INDOOR', price: 95, pricePeak: 125 },
    ],
  },
  {
    name: 'Padel Voluntari',
    city: 'București',
    address: 'Șoseaua București-Nord 26, Voluntari',
    latitude: 44.4969,
    longitude: 26.1583,
    facilities: { hasLockerRoom: true, hasShowers: true, hasParking: true },
    courtsConfig: [
      { name: 'Teren 1', type: 'TRADITIONAL', location: 'INDOOR', price: 80, pricePeak: 100 },
      { name: 'Teren 2', type: 'TRADITIONAL', location: 'INDOOR', price: 80, pricePeak: 100 },
    ],
  },
  {
    name: 'Padel Snagov',
    city: 'Ilfov',
    address: 'Strada Lacului 12, Snagov',
    latitude: 44.7106,
    longitude: 26.1854,
    description: 'Resort cu 3 terenuri, ideal pentru weekend.',
    facilities: {
      hasLockerRoom: true,
      hasShowers: true,
      hasCafe: true,
      hasParking: true,
      hasShop: true,
    },
    courtsConfig: [
      { name: 'Teren 1', type: 'PANORAMIC', location: 'OUTDOOR', price: 90, pricePeak: 120 },
      { name: 'Teren 2', type: 'TRADITIONAL', location: 'OUTDOOR', price: 70, pricePeak: 95 },
      { name: 'Teren 3', type: 'TRADITIONAL', location: 'OUTDOOR', price: 70, pricePeak: 95 },
    ],
  },
  // Out-of-Bucharest clubs
  {
    name: 'Cluj Padel Center',
    city: 'Cluj-Napoca',
    address: 'Calea Turzii 200, Cluj-Napoca',
    latitude: 46.7517,
    longitude: 23.5701,
    description: 'Cel mai mare club de padel din Transilvania, 6 terenuri.',
    facilities: {
      hasLockerRoom: true,
      hasShowers: true,
      hasCafe: true,
      hasParking: true,
      hasSchool: true,
      hasRacketRental: true,
    },
    courtsConfig: [
      { name: 'Teren 1', type: 'PANORAMIC', location: 'INDOOR', price: 80, pricePeak: 110 },
      { name: 'Teren 2', type: 'PANORAMIC', location: 'INDOOR', price: 80, pricePeak: 110 },
      { name: 'Teren 3', type: 'TRADITIONAL', location: 'INDOOR', price: 70, pricePeak: 95 },
      { name: 'Teren 4', type: 'TRADITIONAL', location: 'OUTDOOR', price: 65, pricePeak: 85 },
    ],
  },
  {
    name: 'Padel Brașov',
    city: 'Brașov',
    address: 'Strada Mihai Viteazu 5, Brașov',
    latitude: 45.658,
    longitude: 25.6012,
    facilities: { hasLockerRoom: true, hasShowers: true, hasCafe: true, hasParking: true },
    courtsConfig: [
      { name: 'Teren 1', type: 'PANORAMIC', location: 'INDOOR', price: 75, pricePeak: 100 },
      { name: 'Teren 2', type: 'TRADITIONAL', location: 'OUTDOOR', price: 60, pricePeak: 80 },
      { name: 'Teren 3', type: 'TRADITIONAL', location: 'OUTDOOR', price: 60, pricePeak: 80 },
    ],
  },
  {
    name: 'Timișoara Padel Arena',
    city: 'Timișoara',
    address: 'Calea Aradului 56, Timișoara',
    latitude: 45.7544,
    longitude: 21.2287,
    facilities: { hasLockerRoom: true, hasShowers: true, hasParking: true, hasRacketRental: true },
    courtsConfig: [
      { name: 'Teren 1', type: 'PANORAMIC', location: 'INDOOR', price: 75, pricePeak: 100 },
      { name: 'Teren 2', type: 'PANORAMIC', location: 'INDOOR', price: 75, pricePeak: 100 },
    ],
  },
  {
    name: 'Iași Padel Club',
    city: 'Iași',
    address: 'Bd. Carol I 35, Iași',
    latitude: 47.1739,
    longitude: 27.5774,
    facilities: { hasLockerRoom: true, hasShowers: true, hasCafe: true },
    courtsConfig: [
      { name: 'Teren 1', type: 'TRADITIONAL', location: 'INDOOR', price: 65, pricePeak: 85 },
      { name: 'Teren 2', type: 'TRADITIONAL', location: 'INDOOR', price: 65, pricePeak: 85 },
    ],
  },
  {
    name: 'Constanța Padel Mamaia',
    city: 'Constanța',
    address: 'Bd. Mamaia 250, Constanța',
    latitude: 44.2118,
    longitude: 28.6307,
    description: 'Club sezonier pe litoral, deschis aprilie–octombrie.',
    facilities: { hasLockerRoom: true, hasShowers: true, hasCafe: true, hasShop: true },
    courtsConfig: [
      { name: 'Teren 1', type: 'PANORAMIC', location: 'OUTDOOR', price: 85, pricePeak: 115 },
      { name: 'Teren 2', type: 'TRADITIONAL', location: 'OUTDOOR', price: 70, pricePeak: 95 },
      { name: 'Teren 3', type: 'TRADITIONAL', location: 'OUTDOOR', price: 70, pricePeak: 95 },
    ],
  },
  {
    name: 'Sibiu Padel Hub',
    city: 'Sibiu',
    address: 'Calea Dumbrăvii 145, Sibiu',
    latitude: 45.7916,
    longitude: 24.1416,
    facilities: { hasLockerRoom: true, hasShowers: true, hasParking: true },
    courtsConfig: [
      { name: 'Teren 1', type: 'PANORAMIC', location: 'INDOOR', price: 70, pricePeak: 90 },
      { name: 'Teren 2', type: 'TRADITIONAL', location: 'INDOOR', price: 60, pricePeak: 80 },
    ],
  },
  {
    name: 'Oradea Padel',
    city: 'Oradea',
    address: 'Strada Republicii 78, Oradea',
    latitude: 47.0533,
    longitude: 21.9296,
    facilities: { hasLockerRoom: true, hasShowers: true, hasParking: true },
    courtsConfig: [
      { name: 'Teren 1', type: 'TRADITIONAL', location: 'INDOOR', price: 60, pricePeak: 80 },
      { name: 'Teren 2', type: 'TRADITIONAL', location: 'INDOOR', price: 60, pricePeak: 80 },
    ],
  },
  {
    name: 'Craiova Padel Center',
    city: 'Craiova',
    address: 'Bd. Carol I 56, Craiova',
    latitude: 44.3296,
    longitude: 23.7949,
    facilities: { hasLockerRoom: true, hasShowers: true },
    courtsConfig: [
      { name: 'Teren 1', type: 'TRADITIONAL', location: 'OUTDOOR', price: 55, pricePeak: 75 },
      { name: 'Teren 2', type: 'TRADITIONAL', location: 'OUTDOOR', price: 55, pricePeak: 75 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function weightedPick<T>(weighted: Array<[T, number]>): T {
  const total = weighted.reduce((s, [, w]) => s + w, 0);
  let r = faker.number.float({ min: 0, max: total });
  for (const [v, w] of weighted) {
    r -= w;
    if (r <= 0) return v;
  }
  return weighted[0]![0];
}

/** Generate a level following a realistic Playtomic distribution. */
function sampleLevel(): number {
  // Weighted: clustered between 2.5 and 4.0 with a thin tail
  const bins: Array<[number, number]> = [
    [1.5, 1],
    [2.0, 3],
    [2.5, 8],
    [3.0, 14],
    [3.5, 18],
    [4.0, 14],
    [4.5, 8],
    [5.0, 4],
    [5.5, 2],
    [6.0, 1],
  ];
  return weightedPick(bins);
}

function sampleSide(): 'LEFT' | 'RIGHT' | 'BOTH' {
  return weightedPick<'LEFT' | 'RIGHT' | 'BOTH'>([
    ['LEFT', 0.42],
    ['RIGHT', 0.4],
    ['BOTH', 0.18],
  ]);
}

function sampleGender(): 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' {
  return weightedPick<'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'>([
    ['MALE', 0.62],
    ['FEMALE', 0.34],
    ['OTHER', 0.02],
    ['PREFER_NOT_TO_SAY', 0.02],
  ]);
}

function pickFromArray<T>(arr: readonly T[]): T {
  return arr[faker.number.int({ min: 0, max: arr.length - 1 })]!;
}

function sampleAvailability(): Array<{ dayOfWeek: number; startTime: string; endTime: string }> {
  // Most people are available some weekday evenings + weekend mornings/afternoons
  const slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = [];
  const eveningCount = faker.number.int({ min: 1, max: 4 });
  const weekdays = faker.helpers.shuffle([1, 2, 3, 4, 5]).slice(0, eveningCount);
  for (const d of weekdays) {
    const start = faker.helpers.arrayElement(['17:00', '18:00', '18:30', '19:00']);
    const end = faker.helpers.arrayElement(['20:30', '21:00', '21:30', '22:00']);
    slots.push({ dayOfWeek: d, startTime: start, endTime: end });
  }
  if (faker.datatype.boolean({ probability: 0.7 })) {
    slots.push({
      dayOfWeek: 6,
      startTime: faker.helpers.arrayElement(['09:00', '10:00', '11:00']),
      endTime: faker.helpers.arrayElement(['12:00', '13:00', '14:00']),
    });
  }
  if (faker.datatype.boolean({ probability: 0.5 })) {
    slots.push({
      dayOfWeek: 0,
      startTime: faker.helpers.arrayElement(['10:00', '11:00']),
      endTime: faker.helpers.arrayElement(['13:00', '14:00']),
    });
  }
  return slots;
}

function transliterate(s: string): string {
  // Map Romanian diacritics → ASCII for usernames/emails
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ș/gi, 's')
    .replace(/ț/gi, 't')
    .replace(/ă/gi, 'a')
    .replace(/â/gi, 'a')
    .replace(/î/gi, 'i');
}

// ─────────────────────────────────────────────────────────────────────
// Wipe (idempotent re-run)
// ─────────────────────────────────────────────────────────────────────

async function wipe() {
  // Order matters — children before parents
  await prisma.$transaction([
    prisma.chatMessage.deleteMany(),
    prisma.chatSession.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.tournamentMatch.deleteMany(),
    prisma.tournamentRound.deleteMany(),
    prisma.tournamentPlayer.deleteMany(),
    prisma.tournament.deleteMany(),
    prisma.match.deleteMany(),
    prisma.openMatchParticipant.deleteMany(),
    prisma.openMatchPost.deleteMany(),
    prisma.userFavoriteClub.deleteMany(),
    prisma.availability.deleteMany(),
    prisma.court.deleteMany(),
    prisma.club.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

// ─────────────────────────────────────────────────────────────────────
// Section 1 — users
// ─────────────────────────────────────────────────────────────────────

type SeededUser = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  city: string;
  padelLevel: number;
  preferredSide: 'LEFT' | 'RIGHT' | 'BOTH';
  glickoRating: number;
  glickoRD: number;
  glickoVolatility: number;
  role: 'PLAYER' | 'COACH' | 'CLUB_OWNER' | 'ADMIN';
};

async function seedUsers(): Promise<SeededUser[]> {
  const passwordHash = await hash('demo1234');
  const adminPasswordHash = await hash('admin1234');
  const all: SeededUser[] = [];

  // 2 admins
  const admins = [
    {
      email: 'admin@padel.local',
      username: 'admin',
      firstName: 'Padel',
      lastName: 'Admin',
      gender: 'PREFER_NOT_TO_SAY' as const,
    },
    {
      email: 'admin2@padel.local',
      username: 'admin2',
      firstName: 'Andra',
      lastName: 'Vasilescu',
      gender: 'FEMALE' as const,
    },
  ];
  for (const a of admins) {
    const initial = initialRatingFromLevel(4.0);
    const user = await prisma.user.create({
      data: {
        email: a.email,
        passwordHash: adminPasswordHash,
        username: a.username,
        firstName: a.firstName,
        lastName: a.lastName,
        dateOfBirth: faker.date.between({ from: '1980-01-01', to: '1995-12-31' }),
        gender: a.gender,
        city: 'București',
        role: 'ADMIN',
        isVerified: true,
        padelLevel: 4.0,
        preferredSide: 'BOTH',
        dominantHand: 'RIGHT',
        playFrequency: 'TWO_THREE_WEEK',
        goal: 'MIXED',
        glickoRating: initial.rating,
        glickoRD: initial.rd,
        glickoVolatility: initial.volatility,
      },
    });
    all.push({
      ...user,
      padelLevel: user.padelLevel,
      preferredSide: user.preferredSide as 'LEFT' | 'RIGHT' | 'BOTH',
      gender: user.gender as SeededUser['gender'],
      role: 'ADMIN',
    });
  }

  // 5 club owners — created early so they can own clubs
  const ownerNames = [
    { f: 'Mihai', l: 'Stănescu', g: 'MALE' as const },
    { f: 'Cristina', l: 'Dragomir', g: 'FEMALE' as const },
    { f: 'Bogdan', l: 'Munteanu', g: 'MALE' as const },
    { f: 'Ioana', l: 'Marinescu', g: 'FEMALE' as const },
    { f: 'Radu', l: 'Popescu', g: 'MALE' as const },
  ];
  for (let i = 0; i < ownerNames.length; i++) {
    const o = ownerNames[i]!;
    const initial = initialRatingFromLevel(3.5);
    const user = await prisma.user.create({
      data: {
        email: `owner${i + 1}@padel.local`,
        passwordHash,
        username: `owner_${transliterate(o.l).toLowerCase()}_${i + 1}`,
        firstName: o.f,
        lastName: o.l,
        dateOfBirth: faker.date.between({ from: '1970-01-01', to: '1990-12-31' }),
        gender: o.g,
        city: 'București',
        role: 'CLUB_OWNER',
        isVerified: true,
        padelLevel: 3.5,
        preferredSide: sampleSide(),
        dominantHand: faker.helpers.arrayElement(['LEFT', 'RIGHT'] as const),
        playFrequency: 'TWO_THREE_WEEK',
        goal: 'COMPETITIVE',
        glickoRating: initial.rating,
        glickoRD: initial.rd,
        glickoVolatility: initial.volatility,
      },
    });
    all.push({
      ...user,
      padelLevel: user.padelLevel,
      preferredSide: user.preferredSide as 'LEFT' | 'RIGHT' | 'BOTH',
      gender: user.gender as SeededUser['gender'],
      role: 'CLUB_OWNER',
    });
  }

  // Existing identifiable players (the Phase 1 seed accounts — kept so old smoke-tests still work)
  const identifiable: Array<{
    email: string;
    username: string;
    first: string;
    last: string;
    gender: 'MALE' | 'FEMALE';
    level: number;
    side: 'LEFT' | 'RIGHT' | 'BOTH';
    city: string;
  }> = [
    {
      email: 'andrei@padel.local',
      username: 'andrei_b',
      first: 'Andrei',
      last: 'Bratu',
      gender: 'MALE',
      level: 3.5,
      side: 'LEFT',
      city: 'București',
    },
    {
      email: 'maria@padel.local',
      username: 'maria_c',
      first: 'Maria',
      last: 'Constantin',
      gender: 'FEMALE',
      level: 4.0,
      side: 'RIGHT',
      city: 'București',
    },
    {
      email: 'radu@padel.local',
      username: 'radu_p',
      first: 'Radu',
      last: 'Popa',
      gender: 'MALE',
      level: 2.5,
      side: 'BOTH',
      city: 'Cluj-Napoca',
    },
    {
      email: 'ioana@padel.local',
      username: 'ioana_d',
      first: 'Ioana',
      last: 'Dumitrescu',
      gender: 'FEMALE',
      level: 5.0,
      side: 'LEFT',
      city: 'Brașov',
    },
    {
      email: 'mihai@padel.local',
      username: 'mihai_v',
      first: 'Mihai',
      last: 'Vasile',
      gender: 'MALE',
      level: 3.0,
      side: 'RIGHT',
      city: 'Timișoara',
    },
  ];
  for (const p of identifiable) {
    const initial = initialRatingFromLevel(p.level);
    const user = await prisma.user.create({
      data: {
        email: p.email,
        passwordHash,
        username: p.username,
        firstName: p.first,
        lastName: p.last,
        dateOfBirth: faker.date.between({ from: '1985-01-01', to: '2002-12-31' }),
        gender: p.gender,
        city: p.city,
        role: 'PLAYER',
        padelLevel: p.level,
        preferredSide: p.side,
        dominantHand: 'RIGHT',
        playFrequency: faker.helpers.arrayElement([
          'ONCE_WEEK',
          'TWO_THREE_WEEK',
          'FOUR_PLUS_WEEK',
        ] as const),
        goal: faker.helpers.arrayElement(['RECREATIONAL', 'COMPETITIVE', 'MIXED'] as const),
        glickoRating: initial.rating,
        glickoRD: initial.rd,
        glickoVolatility: initial.volatility,
      },
    });
    all.push({
      ...user,
      padelLevel: user.padelLevel,
      preferredSide: user.preferredSide as 'LEFT' | 'RIGHT' | 'BOTH',
      gender: user.gender as SeededUser['gender'],
      role: 'PLAYER',
    });
  }

  // 55 additional players
  const usedUsernames = new Set(all.map((u) => u.username));
  for (let i = 0; i < 55; i++) {
    const gender = sampleGender();
    const firstName = gender === 'FEMALE' ? pickFromArray(FEMALE_FIRST) : pickFromArray(MALE_FIRST);
    const lastName = pickFromArray(LAST_NAMES);
    const city = weightedPick(CITIES_WEIGHTED);
    const level = sampleLevel();
    let username = `${transliterate(firstName).toLowerCase()}.${transliterate(lastName).toLowerCase()}`;
    let suffix = 0;
    while (usedUsernames.has(username)) {
      suffix++;
      username = `${transliterate(firstName).toLowerCase()}.${transliterate(lastName).toLowerCase()}${suffix}`;
    }
    usedUsernames.add(username);
    const initial = initialRatingFromLevel(level);
    const isCoach = faker.datatype.boolean({ probability: 0.05 });
    const playStyles = ['DEFENSIVE', 'OFFENSIVE', 'BALANCED', 'BUILDER'] as const;

    const user = await prisma.user.create({
      data: {
        email: `${username}@padel.local`,
        passwordHash,
        username,
        firstName,
        lastName,
        dateOfBirth: faker.date.between({ from: '1960-01-01', to: '2008-06-30' }),
        gender,
        city,
        role: 'PLAYER',
        bio: faker.datatype.boolean({ probability: 0.5 })
          ? faker.helpers.arrayElement([
              `Joc de ${faker.number.int({ min: 1, max: 8 })} ani, caut parteneri pentru evenimentele de seară.`,
              'Învăț de la zero, deschis la jocul cu jucători răbdători.',
              'Competitiv, urmăresc clasamentul regional.',
              'Prefer matchurile de weekend dimineața.',
            ])
          : null,
        padelLevel: level,
        preferredSide: sampleSide(),
        dominantHand: faker.helpers.weightedArrayElement([
          { value: 'RIGHT' as const, weight: 0.9 },
          { value: 'LEFT' as const, weight: 0.1 },
        ]),
        playStyle: faker.datatype.boolean({ probability: 0.7 }) ? pickFromArray(playStyles) : null,
        playFrequency: faker.helpers.arrayElement([
          'ONCE_WEEK',
          'TWO_THREE_WEEK',
          'FOUR_PLUS_WEEK',
        ] as const),
        goal: faker.helpers.weightedArrayElement([
          { value: 'RECREATIONAL' as const, weight: 0.45 },
          { value: 'COMPETITIVE' as const, weight: 0.3 },
          { value: 'MIXED' as const, weight: 0.25 },
        ]),
        isCoach,
        coachCertifications: isCoach
          ? JSON.stringify(['Licență FRP nivel 1', 'Curs FIP fundamentals'])
          : null,
        prefMaxLevelDiff: faker.datatype.boolean({ probability: 0.4 })
          ? faker.helpers.arrayElement([0.5, 1.0, 1.5])
          : null,
        glickoRating: initial.rating,
        glickoRD: initial.rd,
        glickoVolatility: initial.volatility,
      },
    });
    all.push({
      ...user,
      padelLevel: user.padelLevel,
      preferredSide: user.preferredSide as 'LEFT' | 'RIGHT' | 'BOTH',
      gender: user.gender as SeededUser['gender'],
      role: 'PLAYER',
    });
  }
  return all;
}

// ─────────────────────────────────────────────────────────────────────
// Section 2 — clubs
// ─────────────────────────────────────────────────────────────────────

async function seedClubs(owners: SeededUser[]): Promise<
  Array<{
    id: string;
    name: string;
    city: string;
    courts: Array<{
      id: string;
      type: 'PANORAMIC' | 'TRADITIONAL' | 'SINGLE_PADEL';
      location: 'INDOOR' | 'OUTDOOR';
    }>;
  }>
> {
  const out: Array<{
    id: string;
    name: string;
    city: string;
    courts: Array<{
      id: string;
      type: 'PANORAMIC' | 'TRADITIONAL' | 'SINGLE_PADEL';
      location: 'INDOOR' | 'OUTDOOR';
    }>;
  }> = [];
  for (let i = 0; i < CLUBS.length; i++) {
    const t = CLUBS[i]!;
    // Assign each club to a club owner round-robin
    const owner = owners[i % owners.length]!;
    // Photos are now native JSON objects per the Phase 5 Part E schema
    // (`photos Json @default("[]")`). The two seeded entries become
    // MAIN + COURTS placeholders; `db:update:photos` typically overwrites
    // these with curated Unsplash padel photos.
    const photos = [
      {
        url: `https://picsum.photos/seed/${slug(t.name)}/800/450`,
        category: 'MAIN' as const,
        order: 0,
      },
      {
        url: `https://picsum.photos/seed/${slug(t.name)}-2/800/450`,
        category: 'COURTS' as const,
        order: 1,
      },
    ];
    const businessHours: Record<string, { open: string; close: string } | null> = {
      monday: { open: '07:00', close: '23:00' },
      tuesday: { open: '07:00', close: '23:00' },
      wednesday: { open: '07:00', close: '23:00' },
      thursday: { open: '07:00', close: '23:00' },
      friday: { open: '07:00', close: '23:00' },
      saturday: { open: '08:00', close: '22:00' },
      sunday: { open: '08:00', close: '22:00' },
    };
    const club = await prisma.club.create({
      data: {
        slug: slug(t.name),
        name: t.name,
        description: t.description ?? null,
        address: t.address,
        city: t.city,
        latitude: t.latitude,
        longitude: t.longitude,
        phone: `+40 72${faker.number.int({ min: 1, max: 9 })} ${faker.string.numeric(3)} ${faker.string.numeric(3)}`,
        website: null,
        photos,
        businessHours: JSON.stringify(businessHours),
        ownerId: owner.id,
        isVerified: true,
        hasLockerRoom: !!t.facilities?.hasLockerRoom,
        hasShowers: !!t.facilities?.hasShowers,
        hasCafe: !!t.facilities?.hasCafe,
        hasParking: !!t.facilities?.hasParking,
        hasShop: !!t.facilities?.hasShop,
        hasSchool: !!t.facilities?.hasSchool,
        hasRacketRental: !!t.facilities?.hasRacketRental,
      },
    });
    const courts: (typeof out)[number]['courts'] = [];
    for (const c of t.courtsConfig) {
      const court = await prisma.court.create({
        data: {
          clubId: club.id,
          name: c.name,
          type: c.type,
          location: c.location,
          surface: c.surface ?? null,
          pricePerHour: c.price ?? null,
          pricePerHourPeak: c.pricePeak ?? null,
        },
      });
      courts.push({ id: court.id, type: c.type, location: c.location });
    }
    out.push({ id: club.id, name: club.name, city: club.city, courts });
  }
  return out;
}

async function seedAvailabilities(players: SeededUser[]) {
  for (const p of players) {
    if (p.role === 'ADMIN') continue;
    const slots = sampleAvailability();
    for (const s of slots) {
      await prisma.availability.create({ data: { userId: p.id, ...s } });
    }
  }
}

async function seedFavorites(players: SeededUser[], clubs: Awaited<ReturnType<typeof seedClubs>>) {
  for (const p of players) {
    if (p.role === 'ADMIN') continue;
    // Prefer clubs in the same city, fall back to anywhere
    const sameCity = clubs.filter((c) => c.city === p.city);
    const pool = sameCity.length >= 2 ? sameCity : clubs;
    const n = faker.number.int({ min: 1, max: Math.min(3, pool.length) });
    const picks = faker.helpers.shuffle([...pool]).slice(0, n);
    for (const club of picks) {
      await prisma.userFavoriteClub.create({ data: { userId: p.id, clubId: club.id } });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Section 3 — match history with chronological Glicko-2 runs
// ─────────────────────────────────────────────────────────────────────

interface RatingState {
  rating: number;
  rd: number;
  volatility: number;
}
type RatingMap = Map<string, RatingState>;

function pickFourCloseLevels(players: SeededUser[]): SeededUser[] {
  // Pick a pivot, then pick 3 others within ±0.5 level, with replacement bailout
  const pivot = pickFromArray(players);
  const close = players.filter(
    (p) => p.id !== pivot.id && Math.abs(p.padelLevel - pivot.padelLevel) <= 0.5,
  );
  if (close.length < 3) {
    const broader = players.filter(
      (p) => p.id !== pivot.id && Math.abs(p.padelLevel - pivot.padelLevel) <= 1.0,
    );
    return [pivot, ...faker.helpers.shuffle(broader).slice(0, 3)];
  }
  return [pivot, ...faker.helpers.shuffle(close).slice(0, 3)];
}

function sampleScore(
  team1Level: number,
  team2Level: number,
): { team1: number; team2: number; winnerTeam: 1 | 2 } {
  // Score is "games won across the match" — typical Americano-style: 0–8 each
  // Closer levels → closer scores
  const diff = team1Level - team2Level;
  // win probability for team1 (rough sigmoid based on level diff)
  const pTeam1 = 1 / (1 + Math.exp(-diff * 1.5));
  const team1Wins = faker.datatype.boolean({ probability: pTeam1 });
  const winnerGames = faker.number.int({ min: 5, max: 8 });
  const loserGames = faker.number.int({ min: 1, max: Math.max(1, winnerGames - 2) });
  return team1Wins
    ? { team1: winnerGames, team2: loserGames, winnerTeam: 1 }
    : { team1: loserGames, team2: winnerGames, winnerTeam: 2 };
}

async function seedMatchHistory(
  players: SeededUser[],
  clubs: Awaited<ReturnType<typeof seedClubs>>,
  ratings: RatingMap,
  count: number,
) {
  const playersOnly = players.filter((p) => p.role !== 'ADMIN');
  const horizon = 180 * 24 * 60 * 60 * 1000; // 180 days
  const now = Date.now();

  // Build a list of (date, four players) sorted chronologically so Glicko
  // updates apply in real time order.
  type PlannedMatch = { date: Date; players: SeededUser[]; clubIdx: number };
  const planned: PlannedMatch[] = [];
  for (let i = 0; i < count; i++) {
    const four = pickFourCloseLevels(playersOnly);
    const offset = faker.number.int({ min: 0, max: horizon });
    planned.push({
      date: new Date(now - offset),
      players: four,
      clubIdx: faker.number.int({ min: 0, max: clubs.length - 1 }),
    });
  }
  planned.sort((a, b) => a.date.getTime() - b.date.getTime());

  console.log(`  generating ${planned.length} historical matches…`);
  let i = 0;
  for (const m of planned) {
    if (++i % 50 === 0) console.log(`    ${i}/${planned.length}…`);

    const [a, b, c, d] = m.players as [SeededUser, SeededUser, SeededUser, SeededUser];
    // Team assignment: best+worst vs middle two (matches the Open Match split logic)
    const sortedByLevel = [a, b, c, d].sort((x, y) => y.padelLevel - x.padelLevel);
    const t1 = [sortedByLevel[0]!, sortedByLevel[3]!];
    const t2 = [sortedByLevel[1]!, sortedByLevel[2]!];

    const t1AvgLevel = (t1[0]!.padelLevel + t1[1]!.padelLevel) / 2;
    const t2AvgLevel = (t2[0]!.padelLevel + t2[1]!.padelLevel) / 2;
    const score = sampleScore(t1AvgLevel, t2AvgLevel);
    const winnerTeam = score.winnerTeam;

    const club = clubs[m.clubIdx]!;

    // Snapshot before
    const before = {
      [t1[0]!.id]: { ...ratings.get(t1[0]!.id)! },
      [t1[1]!.id]: { ...ratings.get(t1[1]!.id)! },
      [t2[0]!.id]: { ...ratings.get(t2[0]!.id)! },
      [t2[1]!.id]: { ...ratings.get(t2[1]!.id)! },
    };

    // Run Glicko-2
    const team1Won = winnerTeam === 1;
    const updated = updateDoublesMatch(
      { p1: before[t1[0]!.id] as Rating, p2: before[t1[1]!.id] as Rating },
      { p1: before[t2[0]!.id] as Rating, p2: before[t2[1]!.id] as Rating },
      team1Won,
    );
    const after = {
      [t1[0]!.id]: updated.team1.p1,
      [t1[1]!.id]: updated.team1.p2,
      [t2[0]!.id]: updated.team2.p1,
      [t2[1]!.id]: updated.team2.p2,
    };

    const changes: Record<string, { before: RatingState; after: RatingState; delta: number }> = {};
    for (const id of Object.keys(after)) {
      changes[id] = {
        before: {
          rating: before[id]!.rating,
          rd: before[id]!.rd,
          volatility: before[id]!.volatility,
        },
        after: { rating: after[id]!.rating, rd: after[id]!.rd, volatility: after[id]!.volatility },
        delta: after[id]!.rating - before[id]!.rating,
      };
      ratings.set(id, after[id]!);
    }

    await prisma.match.create({
      data: {
        type: faker.helpers.weightedArrayElement([
          { value: 'OPEN_MATCH' as const, weight: 0.55 },
          { value: 'FRIENDLY' as const, weight: 0.35 },
          { value: 'TOURNAMENT' as const, weight: 0.1 },
        ]),
        clubId: club.id,
        team1Player1Id: t1[0]!.id,
        team1Player2Id: t1[1]!.id,
        team2Player1Id: t2[0]!.id,
        team2Player2Id: t2[1]!.id,
        scheduledAt: m.date,
        startedAt: m.date,
        completedAt: new Date(m.date.getTime() + 90 * 60 * 1000),
        status: 'VALIDATED',
        scoreSets: JSON.stringify([{ team1Games: score.team1, team2Games: score.team2 }]),
        winnerTeam: winnerTeam,
        scoreEnteredAt: m.date,
        scoreEnteredBy: t1[0]!.id,
        confirmedT1P1: true,
        confirmedT1P2: true,
        confirmedT2P1: true,
        confirmedT2P2: true,
        isValidated: true,
        ratingApplied: true,
        ratingChanges: JSON.stringify(changes),
      },
    });
  }

  // Persist final ratings to user rows
  console.log(`  persisting evolved ratings on ${ratings.size} users…`);
  for (const [userId, r] of ratings) {
    await prisma.user.update({
      where: { id: userId },
      data: { glickoRating: r.rating, glickoRD: r.rd, glickoVolatility: r.volatility },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────
// Section 4 — tournaments
// ─────────────────────────────────────────────────────────────────────

async function seedTournaments(
  players: SeededUser[],
  clubs: Awaited<ReturnType<typeof seedClubs>>,
  owners: SeededUser[],
) {
  const playersOnly = players.filter((p) => p.role === 'PLAYER');
  const now = Date.now();

  // 5 completed Americano tournaments
  for (let i = 0; i < 5; i++) {
    const club = clubs[i % clubs.length]!;
    const organizer = owners[i % owners.length]!;
    const startDate = new Date(now - faker.number.int({ min: 14, max: 120 }) * 24 * 60 * 60 * 1000);

    const t = await prisma.tournament.create({
      data: {
        name: `Cupa ${club.city} ${faker.helpers.arrayElement(['Iarnă', 'Primăvară', 'Vară', 'Toamnă'])} ${startDate.getFullYear()}`,
        format: 'AMERICANO',
        clubId: club.id,
        organizerId: organizer.id,
        startDate,
        endDate: new Date(startDate.getTime() + 6 * 60 * 60 * 1000),
        maxPlayers: 8,
        numberOfRounds: 7,
        numberOfCourts: 2,
        pairingMode: 'ROTATION',
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        status: 'COMPLETED',
        currentRound: 7,
        description: 'Turneu Americano clasic, format complet round-robin.',
      },
    });
    // 8 players from the pool
    const tournPlayers = faker.helpers.shuffle([...playersOnly]).slice(0, 8);
    const tpRows = [];
    for (const p of tournPlayers) {
      tpRows.push(
        await prisma.tournamentPlayer.create({
          data: {
            tournamentId: t.id,
            userId: p.id,
            totalGamesWon: faker.number.int({ min: 12, max: 35 }),
            totalGamesLost: faker.number.int({ min: 10, max: 30 }),
            totalPoints: faker.number.int({ min: 6, max: 18 }),
          },
        }),
      );
    }
    // Final ranks
    const ranked = [...tpRows].sort((a, b) => b.totalPoints - a.totalPoints);
    for (let r = 0; r < ranked.length; r++) {
      await prisma.tournamentPlayer.update({
        where: { id: ranked[r]!.id },
        data: { finalRank: r + 1 },
      });
    }
  }

  // 2 upcoming (REGISTRATION) tournaments
  for (let i = 0; i < 2; i++) {
    const club = clubs[i + 1]!;
    const organizer = owners[i + 1]!;
    const startDate = new Date(now + faker.number.int({ min: 7, max: 35 }) * 24 * 60 * 60 * 1000);
    const t = await prisma.tournament.create({
      data: {
        name: `Padel ${club.city} Open — ${startDate.toLocaleDateString('ro-RO', { month: 'short' })}`,
        format: faker.helpers.arrayElement(['AMERICANO', 'MEXICANO']) as 'AMERICANO' | 'MEXICANO',
        clubId: club.id,
        organizerId: organizer.id,
        startDate,
        maxPlayers: 12,
        numberOfRounds: 8,
        numberOfCourts: 3,
        pairingMode: 'ROTATION',
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        status: 'REGISTRATION',
        currentRound: 0,
        description: 'Înscrieri deschise. Format Americano cu rotație clasică.',
      },
    });
    const subset = faker.helpers
      .shuffle([...playersOnly])
      .slice(0, faker.number.int({ min: 3, max: 9 }));
    for (const p of subset) {
      await prisma.tournamentPlayer.create({ data: { tournamentId: t.id, userId: p.id } });
    }
  }

  // 1 in-progress tournament
  {
    const club = clubs[3]!;
    const organizer = owners[3]!;
    const startDate = new Date(now - 60 * 60 * 1000); // started an hour ago
    const t = await prisma.tournament.create({
      data: {
        name: `Cupa Live — ${club.city}`,
        format: 'AMERICANO',
        clubId: club.id,
        organizerId: organizer.id,
        startDate,
        maxPlayers: 8,
        numberOfRounds: 7,
        numberOfCourts: 2,
        pairingMode: 'ROTATION',
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        status: 'IN_PROGRESS',
        currentRound: 3,
        description: 'Turneu în desfășurare — vizionează în mod TV.',
      },
    });
    const eight = faker.helpers.shuffle([...playersOnly]).slice(0, 8);
    const tps = [];
    for (const p of eight) {
      tps.push(
        await prisma.tournamentPlayer.create({
          data: {
            tournamentId: t.id,
            userId: p.id,
            totalGamesWon: faker.number.int({ min: 4, max: 12 }),
            totalGamesLost: faker.number.int({ min: 3, max: 10 }),
            totalPoints: faker.number.int({ min: 2, max: 8 }),
          },
        }),
      );
    }
    // Generate 7 rounds, 2 matches per round (8 players)
    for (let r = 1; r <= 7; r++) {
      const round = await prisma.tournamentRound.create({
        data: {
          tournamentId: t.id,
          roundNumber: r,
          startedAt: r <= 3 ? new Date(now - (4 - r) * 30 * 60 * 1000) : null,
          completedAt: r <= 2 ? new Date(now - (3 - r) * 30 * 60 * 1000) : null,
        },
      });
      const shuffled = faker.helpers.shuffle([...tps]);
      const matches = [
        { team1: [shuffled[0]!, shuffled[1]!], team2: [shuffled[2]!, shuffled[3]!] },
        { team1: [shuffled[4]!, shuffled[5]!], team2: [shuffled[6]!, shuffled[7]!] },
      ];
      let courtIdx = 0;
      for (const mm of matches) {
        const completed = r <= 2;
        const inProgress = r === 3;
        await prisma.tournamentMatch.create({
          data: {
            roundId: round.id,
            courtNumber: (courtIdx++ % 2) + 1,
            team1Player1Id: mm.team1[0]!.id,
            team1Player2Id: mm.team1[1]!.id,
            team2Player1Id: mm.team2[0]!.id,
            team2Player2Id: mm.team2[1]!.id,
            status: completed ? 'VALIDATED' : inProgress ? 'IN_PROGRESS' : 'SCHEDULED',
            team1Score: completed
              ? faker.number.int({ min: 3, max: 8 })
              : inProgress
                ? faker.number.int({ min: 1, max: 5 })
                : null,
            team2Score: completed
              ? faker.number.int({ min: 1, max: 8 })
              : inProgress
                ? faker.number.int({ min: 0, max: 4 })
                : null,
            completedAt: completed ? new Date(now - (3 - r) * 30 * 60 * 1000) : null,
          },
        });
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Section 5 — open matches
// ─────────────────────────────────────────────────────────────────────

async function seedOpenMatches(
  players: SeededUser[],
  clubs: Awaited<ReturnType<typeof seedClubs>>,
) {
  const playersOnly = players.filter((p) => p.role === 'PLAYER');
  const now = Date.now();

  // 5 fresh (just creator) — 14 days out
  for (let i = 0; i < 5; i++) {
    const club = pickFromArray(clubs);
    const creator = pickFromArray(playersOnly);
    const scheduledAt = new Date(now + faker.number.int({ min: 2, max: 14 }) * 24 * 60 * 60 * 1000);
    const post = await prisma.openMatchPost.create({
      data: {
        creatorId: creator.id,
        clubId: club.id,
        scheduledAt,
        durationMinutes: 90,
        levelMin: Math.max(1.0, creator.padelLevel - 0.5),
        levelMax: Math.min(7.0, creator.padelLevel + 0.5),
        genderRequired: 'ANY',
        notes: faker.helpers.arrayElement([
          'Caut 3 jucători pentru o partidă relaxată.',
          'Match de nivel mediu, mingi de calitate.',
          'Joc dimineața — vibe bun, fără sărăcie de mingi.',
          null,
          null,
        ]),
        status: 'OPEN',
      },
    });
    await prisma.openMatchParticipant.create({
      data: { openMatchId: post.id, userId: creator.id },
    });
  }

  // 5 partial (2-3 players)
  for (let i = 0; i < 5; i++) {
    const club = pickFromArray(clubs);
    const four = faker.helpers
      .shuffle([...playersOnly])
      .slice(0, faker.number.int({ min: 2, max: 3 }));
    const creator = four[0]!;
    const scheduledAt = new Date(now + faker.number.int({ min: 2, max: 14 }) * 24 * 60 * 60 * 1000);
    const post = await prisma.openMatchPost.create({
      data: {
        creatorId: creator.id,
        clubId: club.id,
        scheduledAt,
        durationMinutes: 90,
        levelMin: Math.max(1.0, creator.padelLevel - 0.5),
        levelMax: Math.min(7.0, creator.padelLevel + 0.5),
        genderRequired: 'ANY',
        status: 'OPEN',
      },
    });
    for (const p of four) {
      await prisma.openMatchParticipant.create({ data: { openMatchId: post.id, userId: p.id } });
    }
  }

  // 5 full + match created
  for (let i = 0; i < 5; i++) {
    const club = pickFromArray(clubs);
    const four = faker.helpers.shuffle([...playersOnly]).slice(0, 4);
    const creator = four[0]!;
    const scheduledAt = new Date(now + faker.number.int({ min: 1, max: 7 }) * 24 * 60 * 60 * 1000);
    const post = await prisma.openMatchPost.create({
      data: {
        creatorId: creator.id,
        clubId: club.id,
        scheduledAt,
        durationMinutes: 90,
        levelMin: Math.max(1.0, creator.padelLevel - 0.5),
        levelMax: Math.min(7.0, creator.padelLevel + 0.5),
        genderRequired: 'ANY',
        status: 'FULL',
      },
    });
    for (const p of four) {
      await prisma.openMatchParticipant.create({ data: { openMatchId: post.id, userId: p.id } });
    }
    // Create the resulting Match
    const sorted = [...four].sort((a, b) => b.padelLevel - a.padelLevel);
    await prisma.match.create({
      data: {
        type: 'OPEN_MATCH',
        openMatchId: post.id,
        clubId: club.id,
        team1Player1Id: sorted[0]!.id,
        team1Player2Id: sorted[3]!.id,
        team2Player1Id: sorted[1]!.id,
        team2Player2Id: sorted[2]!.id,
        scheduledAt,
        status: 'SCHEDULED',
      },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────
// Section 6 — notifications + chat sessions
// ─────────────────────────────────────────────────────────────────────

async function seedNotifications(players: SeededUser[]) {
  const types = [
    {
      type: 'MATCH_SCHEDULED' as const,
      title: 'Match-ul tău este complet!',
      body: 'Toți 4 jucătorii s-au înscris pentru match-ul tău programat la Padel Pipera.',
      actionUrl: '/matches',
    },
    {
      type: 'MATCH_RECOMMENDATION' as const,
      title: 'Un nou Open Match potrivit pentru tine',
      body: 'A apărut un Open Match la nivelul tău, vineri seara la Padel Floreasca.',
      actionUrl: '/open-matches',
    },
    {
      type: 'RATING_UPDATED' as const,
      title: 'Rating actualizat',
      body: 'Rating-ul tău s-a modificat cu +12 (nou: 1487).',
      actionUrl: '/profile?tab=rating',
    },
    {
      type: 'TOURNAMENT_INVITATION' as const,
      title: 'Invitație la turneu',
      body: 'Cupa Bucuresti Primăvară începe peste 10 zile. Înscrierile sunt deschise.',
      actionUrl: '/tournaments',
    },
    {
      type: 'WELCOME' as const,
      title: 'Bun venit pe Padel Platform!',
      body: 'Completează-ți disponibilitatea și încearcă să găsești primul tău partener.',
      actionUrl: '/profile',
    },
  ];
  for (const p of players.filter((u) => u.role === 'PLAYER')) {
    const n = faker.number.int({ min: 2, max: 5 });
    const shuffled = faker.helpers.shuffle([...types]).slice(0, n);
    for (const tpl of shuffled) {
      await prisma.notification.create({
        data: {
          userId: p.id,
          type: tpl.type,
          title: tpl.title,
          body: tpl.body,
          actionUrl: tpl.actionUrl,
          isRead: faker.datatype.boolean({ probability: 0.3 }),
          createdAt: faker.date.recent({ days: 14 }),
        },
      });
    }
  }
}

async function seedChatSessions(players: SeededUser[]) {
  const players10 = faker.helpers.shuffle(players.filter((p) => p.role === 'PLAYER')).slice(0, 10);
  const samples = [
    {
      user: 'Ce înseamnă bandeja?',
      asst: 'Bandeja este o lovitură de control la jumătatea drumului dintre volei și smash, executată cu efect descendent pentru a păstra poziția la plasă.',
    },
    {
      user: 'Care este diferența dintre Americano și Mexicano?',
      asst: 'În Americano programul este fix dinainte (round-robin). În Mexicano, fiecare rundă se generează dinamic din clasamentul curent — primul cu al patrulea contra doi cu trei.',
    },
    {
      user: 'Cum funcționează rating-ul Glicko-2?',
      asst: 'Glicko-2 menține trei numere per jucător: rating, RD (incertitudine) și volatilitate. Mișcările sunt mai mari când RD este mare (sistemul nu te cunoaște) și mai mici după multe match-uri (rating stabilizat).',
    },
  ];
  for (const p of players10) {
    const s = await prisma.chatSession.create({
      data: { userId: p.id, title: pickFromArray(samples).user.slice(0, 60) },
    });
    const sample = pickFromArray(samples);
    await prisma.chatMessage.create({
      data: { sessionId: s.id, role: 'USER', content: sample.user },
    });
    await prisma.chatMessage.create({
      data: { sessionId: s.id, role: 'ASSISTANT', content: sample.asst, contextChunkIds: '[]' },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────
// Orchestrator
// ─────────────────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now();
  console.log('Wiping existing data…');
  await wipe();
  void Prisma; // unused import guard

  console.log('Seeding users…');
  const users = await seedUsers();
  console.log(`  ${users.length} users created`);
  const owners = users.filter((u) => u.role === 'CLUB_OWNER');

  console.log('Seeding clubs…');
  const clubs = await seedClubs(owners);
  console.log(`  ${clubs.length} clubs created`);

  console.log('Seeding availabilities + favorites…');
  await seedAvailabilities(users);
  await seedFavorites(users, clubs);

  console.log('Seeding match history (with chronological Glicko runs)…');
  const ratings: RatingMap = new Map();
  for (const u of users) {
    ratings.set(u.id, { rating: u.glickoRating, rd: u.glickoRD, volatility: u.glickoVolatility });
  }
  await seedMatchHistory(users, clubs, ratings, 400);

  console.log('Seeding tournaments…');
  await seedTournaments(users, clubs, owners);

  console.log('Seeding open matches…');
  await seedOpenMatches(users, clubs);

  console.log('Seeding notifications + chat sessions…');
  await seedNotifications(users);
  await seedChatSessions(users);

  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
