/**
 * Tiny client-side image compressor used before uploading club photos.
 *
 * Why not pull in `browser-image-compression`? At ~30KB minified it's
 * overkill for our 50-line need. This implementation:
 *
 *   1. Reads the File into an HTMLImageElement.
 *   2. Draws it onto a canvas, scaled so the longest edge ≤ maxDim.
 *   3. Re-encodes as JPEG at the given quality.
 *   4. Returns a `data:image/jpeg;base64,…` URL plus the compressed byte
 *      length so the caller can show "before → after" and refuse files
 *      that are still too large after compression.
 */

export interface CompressionResult {
  /** data:image/jpeg;base64,…  ready to POST */
  dataUrl: string;
  /** Number of base64 characters in dataUrl. Roughly 4/3 of the binary size. */
  encodedSize: number;
  /** Width / height of the compressed output in pixels. */
  width: number;
  height: number;
  /** Original file size in bytes (for "before" display). */
  originalSize: number;
}

export interface CompressOptions {
  /** Longest edge in pixels. Default: 1200. */
  maxDim?: number;
  /** JPEG quality 0..1. Default: 0.8. */
  quality?: number;
}

export async function compressImageFile(
  file: File,
  opts: CompressOptions = {},
): Promise<CompressionResult> {
  const maxDim = opts.maxDim ?? 1200;
  const quality = opts.quality ?? 0.8;

  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  // Compute target dimensions preserving aspect ratio.
  let { width, height } = img;
  if (Math.max(width, height) > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.drawImage(img, 0, 0, width, height);

  const out = canvas.toDataURL('image/jpeg', quality);
  return {
    dataUrl: out,
    encodedSize: out.length,
    width,
    height,
    originalSize: file.size,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image failed to decode.'));
    img.src = src;
  });
}

/** Human-readable file size for the UI ("1.2 MB", "456 KB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
