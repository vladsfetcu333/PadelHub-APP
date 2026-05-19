import { z } from 'zod';
import { PHOTO_CATEGORIES } from '../types/api';

/** A data URL must start with "data:image/<format>;base64,<payload>".
 *  Accepted: jpeg, png, webp, gif. We reject everything else to keep
 *  malicious payloads (e.g. SVG with embedded scripts) out. */
const DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/]+=*$/;

/** Cap on the encoded base64 payload (before parsing). 2 MB of base64
 *  decodes to roughly 1.5 MB binary — comfortable for compressed JPEGs.
 *  Client-side compression keeps real uploads well under this. */
const MAX_BASE64_BYTES = 2 * 1024 * 1024;

export const UploadClubPhotoSchema = z
  .object({
    photo: z
      .string()
      .min(1)
      .refine((s) => DATA_URL_RE.test(s), {
        message: 'photo must be a data:image/<type>;base64,… URL',
      })
      .refine((s) => s.length <= MAX_BASE64_BYTES, {
        message: 'photo exceeds 2 MB after compression',
      }),
    category: z.enum(PHOTO_CATEGORIES),
    caption: z.string().max(200).optional(),
  })
  .strict();

export const ReorderClubPhotosSchema = z
  .object({
    /** New order — array of original indices, must be a permutation of [0..n-1]. */
    order: z.array(z.number().int().min(0)).max(5),
  })
  .strict();
