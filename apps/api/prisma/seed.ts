import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import slugify from 'slugify';

const prisma = new PrismaClient();

const hash = (s: string) => bcrypt.hash(s, 10);
const slug = (s: string) => slugify(s, { lower: true, strict: true });

interface PlayerSeed {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  city: string;
  bio?: string;
  padelLevel: number;
  preferredSide: 'LEFT' | 'RIGHT' | 'BOTH';
  dominantHand: 'LEFT' | 'RIGHT';
  playStyle?: 'DEFENSIVE' | 'OFFENSIVE' | 'BALANCED' | 'BUILDER';
  playFrequency: 'ONCE_WEEK' | 'TWO_THREE_WEEK' | 'FOUR_PLUS_WEEK';
  goal: 'RECREATIONAL' | 'COMPETITIVE' | 'MIXED';
}

const ADMIN: Omit<
  PlayerSeed,
  'padelLevel' | 'preferredSide' | 'dominantHand' | 'playFrequency' | 'goal' | 'gender'
> & {
  padelLevel?: number;
  role: 'ADMIN';
} = {
  email: 'admin@padel.local',
  username: 'admin',
  password: 'admin1234',
  firstName: 'Padel',
  lastName: 'Admin',
  dateOfBirth: new Date('1990-01-01'),
  city: 'București',
  role: 'ADMIN',
};

const PLAYERS: PlayerSeed[] = [
  {
    email: 'andrei@padel.local',
    username: 'andrei_b',
    password: 'player1234',
    firstName: 'Andrei',
    lastName: 'Bratu',
    dateOfBirth: new Date('1995-03-12'),
    gender: 'MALE',
    city: 'București',
    bio: 'Joc de 3 ani, caut parteneri pentru meciuri de seară.',
    padelLevel: 3.5,
    preferredSide: 'LEFT',
    dominantHand: 'RIGHT',
    playStyle: 'BUILDER',
    playFrequency: 'TWO_THREE_WEEK',
    goal: 'COMPETITIVE',
  },
  {
    email: 'maria@padel.local',
    username: 'maria_c',
    password: 'player1234',
    firstName: 'Maria',
    lastName: 'Constantin',
    dateOfBirth: new Date('1992-07-22'),
    gender: 'FEMALE',
    city: 'București',
    padelLevel: 4.0,
    preferredSide: 'RIGHT',
    dominantHand: 'RIGHT',
    playStyle: 'OFFENSIVE',
    playFrequency: 'FOUR_PLUS_WEEK',
    goal: 'COMPETITIVE',
  },
  {
    email: 'radu@padel.local',
    username: 'radu_p',
    password: 'player1234',
    firstName: 'Radu',
    lastName: 'Popa',
    dateOfBirth: new Date('1998-11-05'),
    gender: 'MALE',
    city: 'Cluj-Napoca',
    bio: 'Începător entuziast, vreau să mă antrenez în weekenduri.',
    padelLevel: 2.5,
    preferredSide: 'BOTH',
    dominantHand: 'LEFT',
    playStyle: 'DEFENSIVE',
    playFrequency: 'ONCE_WEEK',
    goal: 'RECREATIONAL',
  },
  {
    email: 'ioana@padel.local',
    username: 'ioana_d',
    password: 'player1234',
    firstName: 'Ioana',
    lastName: 'Dumitrescu',
    dateOfBirth: new Date('1989-02-14'),
    gender: 'FEMALE',
    city: 'Brașov',
    padelLevel: 5.0,
    preferredSide: 'LEFT',
    dominantHand: 'RIGHT',
    playStyle: 'BALANCED',
    playFrequency: 'TWO_THREE_WEEK',
    goal: 'MIXED',
  },
  {
    email: 'mihai@padel.local',
    username: 'mihai_v',
    password: 'player1234',
    firstName: 'Mihai',
    lastName: 'Vasile',
    dateOfBirth: new Date('2000-05-30'),
    gender: 'MALE',
    city: 'Timișoara',
    padelLevel: 3.0,
    preferredSide: 'RIGHT',
    dominantHand: 'RIGHT',
    playFrequency: 'ONCE_WEEK',
    goal: 'RECREATIONAL',
  },
];

interface ClubSeed {
  name: string;
  description: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  facilities: {
    hasLockerRoom?: boolean;
    hasShowers?: boolean;
    hasCafe?: boolean;
    hasParking?: boolean;
    hasShop?: boolean;
    hasSchool?: boolean;
    hasRacketRental?: boolean;
  };
  courts: Array<{
    name: string;
    type: 'PANORAMIC' | 'TRADITIONAL' | 'SINGLE_PADEL';
    location: 'INDOOR' | 'OUTDOOR';
    surface?: string;
    pricePerHour?: number;
    pricePerHourPeak?: number;
  }>;
}

// Realistic Bucharest-area padel clubs with approximate coordinates of well-known
// neighbourhoods. Coordinates are approximate; real venues' addresses are paraphrased.
const CLUBS: ClubSeed[] = [
  {
    name: 'Padel Club Băneasa',
    description:
      'Club de padel cu 4 terenuri panoramice, vestiare moderne și școală pentru începători.',
    address: 'Șoseaua București-Ploiești 42A, București',
    city: 'București',
    latitude: 44.5101,
    longitude: 26.0833,
    phone: '+40 721 000 001',
    website: 'https://example.com/baneasa',
    facilities: {
      hasLockerRoom: true,
      hasShowers: true,
      hasCafe: true,
      hasParking: true,
      hasSchool: true,
      hasRacketRental: true,
    },
    courts: [
      {
        name: 'Teren 1',
        type: 'PANORAMIC',
        location: 'INDOOR',
        surface: 'Iarbă sintetică',
        pricePerHour: 90,
        pricePerHourPeak: 120,
      },
      {
        name: 'Teren 2',
        type: 'PANORAMIC',
        location: 'INDOOR',
        surface: 'Iarbă sintetică',
        pricePerHour: 90,
        pricePerHourPeak: 120,
      },
      {
        name: 'Teren 3',
        type: 'TRADITIONAL',
        location: 'OUTDOOR',
        surface: 'Iarbă sintetică',
        pricePerHour: 80,
        pricePerHourPeak: 100,
      },
      {
        name: 'Teren 4',
        type: 'TRADITIONAL',
        location: 'OUTDOOR',
        surface: 'Iarbă sintetică',
        pricePerHour: 80,
        pricePerHourPeak: 100,
      },
    ],
  },
  {
    name: 'Padel Pipera',
    description: 'Două terenuri acoperite, ideal pentru jocul pe orice vreme.',
    address: 'Bd. Pipera 25, Voluntari',
    city: 'București',
    latitude: 44.4923,
    longitude: 26.1265,
    phone: '+40 721 000 002',
    facilities: { hasLockerRoom: true, hasShowers: true, hasParking: true, hasRacketRental: true },
    courts: [
      {
        name: 'Central',
        type: 'PANORAMIC',
        location: 'INDOOR',
        pricePerHour: 100,
        pricePerHourPeak: 130,
      },
      {
        name: 'Court 2',
        type: 'TRADITIONAL',
        location: 'INDOOR',
        pricePerHour: 90,
        pricePerHourPeak: 120,
      },
    ],
  },
  {
    name: 'Padel Park Herăstrău',
    description: 'Club outdoor lângă parcul Herăstrău cu 3 terenuri.',
    address: 'Șoseaua Nordului 28, București',
    city: 'București',
    latitude: 44.4794,
    longitude: 26.0876,
    phone: '+40 721 000 003',
    facilities: { hasLockerRoom: true, hasShowers: true, hasCafe: true, hasParking: true },
    courts: [
      {
        name: 'Teren 1',
        type: 'PANORAMIC',
        location: 'OUTDOOR',
        pricePerHour: 75,
        pricePerHourPeak: 95,
      },
      {
        name: 'Teren 2',
        type: 'TRADITIONAL',
        location: 'OUTDOOR',
        pricePerHour: 70,
        pricePerHourPeak: 90,
      },
      {
        name: 'Teren 3',
        type: 'TRADITIONAL',
        location: 'OUTDOOR',
        pricePerHour: 70,
        pricePerHourPeak: 90,
      },
    ],
  },
  {
    name: 'Padel Arena Floreasca',
    description: 'Arena modernă în Floreasca, 4 terenuri și școală pentru copii.',
    address: 'Calea Floreasca 169, București',
    city: 'București',
    latitude: 44.4673,
    longitude: 26.0959,
    phone: '+40 721 000 004',
    website: 'https://example.com/floreasca',
    facilities: {
      hasLockerRoom: true,
      hasShowers: true,
      hasCafe: true,
      hasParking: true,
      hasShop: true,
      hasSchool: true,
      hasRacketRental: true,
    },
    courts: [
      {
        name: 'Court A',
        type: 'PANORAMIC',
        location: 'INDOOR',
        pricePerHour: 110,
        pricePerHourPeak: 150,
      },
      {
        name: 'Court B',
        type: 'PANORAMIC',
        location: 'INDOOR',
        pricePerHour: 110,
        pricePerHourPeak: 150,
      },
      {
        name: 'Court C',
        type: 'TRADITIONAL',
        location: 'INDOOR',
        pricePerHour: 95,
        pricePerHourPeak: 130,
      },
      {
        name: 'Single',
        type: 'SINGLE_PADEL',
        location: 'INDOOR',
        pricePerHour: 70,
        pricePerHourPeak: 95,
      },
    ],
  },
  {
    name: 'Padel Aviatorilor',
    description: 'Două terenuri panoramice acoperite, parcare ușoară, lângă Piața Aviatorilor.',
    address: 'Bd. Aviatorilor 90, București',
    city: 'București',
    latitude: 44.467,
    longitude: 26.0833,
    facilities: { hasLockerRoom: true, hasShowers: true, hasParking: true, hasCafe: true },
    courts: [
      {
        name: 'Teren 1',
        type: 'PANORAMIC',
        location: 'INDOOR',
        pricePerHour: 100,
        pricePerHourPeak: 130,
      },
      {
        name: 'Teren 2',
        type: 'PANORAMIC',
        location: 'INDOOR',
        pricePerHour: 100,
        pricePerHourPeak: 130,
      },
    ],
  },
  {
    name: 'Padel Tineretului',
    description: 'Club outdoor cu 3 terenuri în zona Tineretului.',
    address: 'Aleea Sandu Aldea 4, București',
    city: 'București',
    latitude: 44.4112,
    longitude: 26.1042,
    facilities: { hasLockerRoom: true, hasParking: true, hasRacketRental: true },
    courts: [
      {
        name: 'Teren 1',
        type: 'TRADITIONAL',
        location: 'OUTDOOR',
        pricePerHour: 70,
        pricePerHourPeak: 90,
      },
      {
        name: 'Teren 2',
        type: 'TRADITIONAL',
        location: 'OUTDOOR',
        pricePerHour: 70,
        pricePerHourPeak: 90,
      },
      {
        name: 'Teren 3',
        type: 'PANORAMIC',
        location: 'OUTDOOR',
        pricePerHour: 80,
        pricePerHourPeak: 100,
      },
    ],
  },
  {
    name: 'Padel Otopeni',
    description: 'Club mare aproape de aeroport, 4 terenuri și școală.',
    address: 'Calea Bucureștilor 305, Otopeni',
    city: 'Ilfov',
    latitude: 44.5536,
    longitude: 26.0851,
    phone: '+40 721 000 007',
    facilities: {
      hasLockerRoom: true,
      hasShowers: true,
      hasCafe: true,
      hasParking: true,
      hasSchool: true,
    },
    courts: [
      {
        name: 'Court 1',
        type: 'PANORAMIC',
        location: 'INDOOR',
        pricePerHour: 95,
        pricePerHourPeak: 125,
      },
      {
        name: 'Court 2',
        type: 'PANORAMIC',
        location: 'INDOOR',
        pricePerHour: 95,
        pricePerHourPeak: 125,
      },
      {
        name: 'Court 3',
        type: 'TRADITIONAL',
        location: 'OUTDOOR',
        pricePerHour: 75,
        pricePerHourPeak: 95,
      },
      {
        name: 'Court 4',
        type: 'TRADITIONAL',
        location: 'OUTDOOR',
        pricePerHour: 75,
        pricePerHourPeak: 95,
      },
    ],
  },
  {
    name: 'Padel Berceni',
    description: 'Două terenuri tradiționale outdoor, accesibile ca preț.',
    address: 'Șoseaua Berceni 110, București',
    city: 'București',
    latitude: 44.378,
    longitude: 26.155,
    facilities: { hasParking: true, hasRacketRental: true },
    courts: [
      {
        name: 'Teren 1',
        type: 'TRADITIONAL',
        location: 'OUTDOOR',
        pricePerHour: 60,
        pricePerHourPeak: 80,
      },
      {
        name: 'Teren 2',
        type: 'TRADITIONAL',
        location: 'OUTDOOR',
        pricePerHour: 60,
        pricePerHourPeak: 80,
      },
    ],
  },
  {
    name: 'Padel Drumul Taberei',
    description: 'Club de cartier cu 2 terenuri panoramice.',
    address: 'Drumul Taberei 32, București',
    city: 'București',
    latitude: 44.4232,
    longitude: 26.0344,
    facilities: { hasLockerRoom: true, hasShowers: true, hasParking: true },
    courts: [
      {
        name: 'Teren 1',
        type: 'PANORAMIC',
        location: 'INDOOR',
        pricePerHour: 85,
        pricePerHourPeak: 110,
      },
      {
        name: 'Teren 2',
        type: 'PANORAMIC',
        location: 'OUTDOOR',
        pricePerHour: 70,
        pricePerHourPeak: 90,
      },
    ],
  },
  {
    name: 'Padel Snagov',
    description: 'Resort cu 3 terenuri, ideal pentru weekend.',
    address: 'Strada Lacului 12, Snagov',
    city: 'Ilfov',
    latitude: 44.7106,
    longitude: 26.1854,
    facilities: {
      hasLockerRoom: true,
      hasShowers: true,
      hasCafe: true,
      hasParking: true,
      hasShop: true,
    },
    courts: [
      {
        name: 'Court 1',
        type: 'PANORAMIC',
        location: 'OUTDOOR',
        pricePerHour: 90,
        pricePerHourPeak: 120,
      },
      {
        name: 'Court 2',
        type: 'PANORAMIC',
        location: 'OUTDOOR',
        pricePerHour: 90,
        pricePerHourPeak: 120,
      },
      {
        name: 'Court 3',
        type: 'TRADITIONAL',
        location: 'OUTDOOR',
        pricePerHour: 80,
        pricePerHourPeak: 100,
      },
    ],
  },
];

const DEFAULT_HOURS = JSON.stringify({
  monday: { open: '08:00', close: '23:00' },
  tuesday: { open: '08:00', close: '23:00' },
  wednesday: { open: '08:00', close: '23:00' },
  thursday: { open: '08:00', close: '23:00' },
  friday: { open: '08:00', close: '23:00' },
  saturday: { open: '08:00', close: '22:00' },
  sunday: { open: '09:00', close: '22:00' },
});

async function main() {
  console.log('Seeding admin…');
  await prisma.user.upsert({
    where: { email: ADMIN.email },
    update: {},
    create: {
      email: ADMIN.email,
      username: ADMIN.username,
      passwordHash: await hash(ADMIN.password),
      firstName: ADMIN.firstName,
      lastName: ADMIN.lastName,
      dateOfBirth: ADMIN.dateOfBirth,
      gender: 'PREFER_NOT_TO_SAY',
      city: ADMIN.city,
      padelLevel: 4.0,
      preferredSide: 'BOTH',
      dominantHand: 'RIGHT',
      playFrequency: 'TWO_THREE_WEEK',
      goal: 'MIXED',
      role: 'ADMIN',
      isVerified: true,
    },
  });

  console.log('Seeding players…');
  for (const p of PLAYERS) {
    await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        username: p.username,
        passwordHash: await hash(p.password),
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        city: p.city,
        bio: p.bio ?? null,
        padelLevel: p.padelLevel,
        preferredSide: p.preferredSide,
        dominantHand: p.dominantHand,
        playStyle: p.playStyle ?? null,
        playFrequency: p.playFrequency,
        goal: p.goal,
      },
    });
  }

  console.log('Seeding clubs…');
  for (const club of CLUBS) {
    const clubSlug = slug(club.name);

    const upserted = await prisma.club.upsert({
      where: { slug: clubSlug },
      update: {
        name: club.name,
        description: club.description,
        address: club.address,
        city: club.city,
        latitude: club.latitude,
        longitude: club.longitude,
        phone: club.phone ?? null,
        website: club.website ?? null,
        ...club.facilities,
        businessHours: DEFAULT_HOURS,
        isVerified: true,
      },
      create: {
        slug: clubSlug,
        name: club.name,
        description: club.description,
        address: club.address,
        city: club.city,
        latitude: club.latitude,
        longitude: club.longitude,
        phone: club.phone ?? null,
        website: club.website ?? null,
        photos: '[]',
        businessHours: DEFAULT_HOURS,
        isVerified: true,
        ...club.facilities,
      },
    });

    // Replace courts wholesale: simpler than diffing, idempotent in practice
    await prisma.court.deleteMany({ where: { clubId: upserted.id } });
    for (const c of club.courts) {
      await prisma.court.create({
        data: {
          clubId: upserted.id,
          name: c.name,
          type: c.type,
          location: c.location,
          surface: c.surface ?? null,
          pricePerHour: c.pricePerHour ?? null,
          pricePerHourPeak: c.pricePerHourPeak ?? null,
        },
      });
    }
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
