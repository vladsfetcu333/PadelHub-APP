/**
 * Club photo service — Phase 5 Part E.
 *
 * Photos live as a JSON array on `Club.photos` (post-migration, native
 * jsonb). Each entry is `{ url, category, caption?, order }`.
 *
 * Storage approach: base64 data URLs in the JSON column. Chosen over an
 * external blob host (S3 / Cloudinary) so the thesis demo has no extra
 * deployment dependencies. The client compresses to ≤1200x1200 / JPEG
 * q=0.8 before upload, the Zod schema rejects payloads >2 MB. In a
 * production rewrite this would migrate to a CDN — documented as known
 * tech debt in PHASE5_REPORT.md.
 *
 * Authorization: ADMIN, or the club owner (`Club.ownerId === userId`).
 * Enforced via `assertCanManage` below; routes call it before mutating.
 */
import type { ClubPhotoCategory, ClubPhotoDto, UserRole } from '@padel/shared';
import { MAX_CLUB_PHOTOS, PHOTO_CATEGORIES } from '@padel/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { badRequest, forbidden, notFound } from '../lib/httpError.js';

async function loadClubAndAuthorize(clubId: string, callerId: string, callerRole: UserRole) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) throw notFound('Club not found');
  if (callerRole !== 'ADMIN' && club.ownerId !== callerId) {
    throw forbidden('Doar administratorul sau proprietarul clubului poate modifica fotografiile.');
  }
  return club;
}

/**
 * Parse the stored photos column into a strict ClubPhotoDto[] sorted by
 * `order`. Tolerant of legacy plain-URL strings (auto-promoted to
 * MAIN/order=index) so old data keeps rendering.
 */
function normalizePhotos(raw: unknown): ClubPhotoDto[] {
  if (!Array.isArray(raw)) return [];
  const out: ClubPhotoDto[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (typeof item === 'string') {
      out.push({ url: item, category: 'MAIN', order: i });
      continue;
    }
    if (typeof item === 'object' && item !== null) {
      const o = item as Record<string, unknown>;
      const url = typeof o['url'] === 'string' ? o['url'] : null;
      if (!url) continue;
      const cat = (
        typeof o['category'] === 'string' &&
        PHOTO_CATEGORIES.includes(o['category'] as ClubPhotoCategory)
          ? o['category']
          : 'MAIN'
      ) as ClubPhotoCategory;
      const photo: ClubPhotoDto = {
        url,
        category: cat,
        order: typeof o['order'] === 'number' ? o['order'] : i,
      };
      if (typeof o['caption'] === 'string') photo.caption = o['caption'];
      out.push(photo);
    }
  }
  return out.sort((a, b) => a.order - b.order);
}

export async function addClubPhoto(
  clubId: string,
  callerId: string,
  callerRole: UserRole,
  input: { photo: string; category: ClubPhotoCategory; caption?: string },
): Promise<ClubPhotoDto[]> {
  const club = await loadClubAndAuthorize(clubId, callerId, callerRole);
  const current = normalizePhotos(club.photos);
  if (current.length >= MAX_CLUB_PHOTOS) {
    throw badRequest(
      `Acest club are deja ${MAX_CLUB_PHOTOS} fotografii. Șterge una înainte de a încărca alta.`,
    );
  }
  const next: ClubPhotoDto[] = [
    ...current,
    {
      url: input.photo,
      category: input.category,
      order: current.length,
      ...(input.caption ? { caption: input.caption } : {}),
    },
  ];
  // Prisma's `Json` column types are `InputJsonValue`; the structural
  // ClubPhotoDto[] matches at runtime but TS needs the cast.
  await prisma.club.update({
    where: { id: clubId },
    data: { photos: next as unknown as Prisma.InputJsonValue },
  });
  return next;
}

export async function deleteClubPhoto(
  clubId: string,
  photoIndex: number,
  callerId: string,
  callerRole: UserRole,
): Promise<ClubPhotoDto[]> {
  const club = await loadClubAndAuthorize(clubId, callerId, callerRole);
  const current = normalizePhotos(club.photos);
  if (photoIndex < 0 || photoIndex >= current.length) {
    throw badRequest(`Index invalid: ${photoIndex} (există ${current.length} fotografii).`);
  }
  // Splice + re-number `order` so the array stays compact.
  const next = current.filter((_, i) => i !== photoIndex).map((p, i) => ({ ...p, order: i }));
  // Prisma's `Json` column types are `InputJsonValue`; the structural
  // ClubPhotoDto[] matches at runtime but TS needs the cast.
  await prisma.club.update({
    where: { id: clubId },
    data: { photos: next as unknown as Prisma.InputJsonValue },
  });
  return next;
}

export async function reorderClubPhotos(
  clubId: string,
  newOrder: number[],
  callerId: string,
  callerRole: UserRole,
): Promise<ClubPhotoDto[]> {
  const club = await loadClubAndAuthorize(clubId, callerId, callerRole);
  const current = normalizePhotos(club.photos);
  if (newOrder.length !== current.length) {
    throw badRequest(
      `order trebuie să aibă exact ${current.length} elemente — primit ${newOrder.length}.`,
    );
  }
  // Validate it's a permutation of [0..n-1].
  const sorted = [...newOrder].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i) throw badRequest('order trebuie să fie o permutare a indexilor 0..n-1.');
  }
  const next: ClubPhotoDto[] = newOrder.map((srcIdx, dstIdx) => ({
    ...current[srcIdx]!,
    order: dstIdx,
  }));
  // Prisma's `Json` column types are `InputJsonValue`; the structural
  // ClubPhotoDto[] matches at runtime but TS needs the cast.
  await prisma.club.update({
    where: { id: clubId },
    data: { photos: next as unknown as Prisma.InputJsonValue },
  });
  return next;
}
