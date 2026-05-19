/**
 * Photo gallery management — admin / club-owner only.
 *
 * Shown beneath the public gallery on the club detail page when the
 * current user can manage this club. Supports:
 *
 *   - "Adaugă fotografie" (modal with file input + category select + caption)
 *   - Per-photo delete (with confirmation alert dialog)
 *   - Per-photo reorder via up/down arrows (drag-and-drop deferred — the
 *     up/down buttons cover the same need with less complexity for now)
 *
 * The base64 payload sent to POST /api/clubs/:id/photos is produced by
 * `compressImageFile` (1200px longest edge, JPEG 0.8). The upload modal
 * shows before/after sizes and refuses anything still >2 MB after
 * compression.
 */
import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Image as ImageIcon, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { ClubPhotoCategory, ClubPhotoDto } from '@padel/shared';
import { MAX_CLUB_PHOTOS, PHOTO_CATEGORIES } from '@padel/shared';

import { api, extractErrorMessage } from '@/lib/api';
import { compressImageFile, formatBytes, type CompressionResult } from '@/lib/imageCompress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// 2 MB after compression — matches the Zod schema cap on the API side.
const MAX_BYTES_AFTER_COMPRESSION = 2 * 1024 * 1024;

const CATEGORY_LABEL: Record<ClubPhotoCategory, string> = {
  MAIN: 'Principală',
  COURTS: 'Terenuri',
  LOCKER_ROOM: 'Vestiar',
  FACILITIES: 'Facilități',
  EXTERIOR: 'Exterior',
};

interface ClubPhotoManagerProps {
  clubId: string;
  photos: ClubPhotoDto[];
  onPhotosChange: (next: ClubPhotoDto[]) => void;
}

export function ClubPhotoManager({ clubId, photos, onPhotosChange }: ClubPhotoManagerProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const moveBy = async (idx: number, delta: -1 | 1) => {
    const target = idx + delta;
    if (target < 0 || target >= photos.length || busy) return;
    const order = photos.map((_, i) => i);
    [order[idx]!, order[target]!] = [order[target]!, order[idx]!];
    setBusy(true);
    try {
      const { data } = await api.patch<{ photos: ClubPhotoDto[] }>(
        `/api/clubs/${clubId}/photos/reorder`,
        { order },
      );
      onPhotosChange(data.photos);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (deletingIdx === null) return;
    setBusy(true);
    try {
      const { data } = await api.delete<{ photos: ClubPhotoDto[] }>(
        `/api/clubs/${clubId}/photos/${deletingIdx}`,
      );
      onPhotosChange(data.photos);
      toast.success('Fotografie ștearsă.');
      setDeletingIdx(null);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const atLimit = photos.length >= MAX_CLUB_PHOTOS;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          Gestionează fotografiile{' '}
          <span className="text-xs font-normal text-muted-foreground">
            ({photos.length} din {MAX_CLUB_PHOTOS})
          </span>
        </CardTitle>
        <Button
          size="sm"
          onClick={() => setUploadOpen(true)}
          disabled={atLimit || busy}
          title={atLimit ? `Atins maxim ${MAX_CLUB_PHOTOS} fotografii` : undefined}
        >
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Adaugă fotografie
        </Button>
      </CardHeader>
      <CardContent>
        {photos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Niciun fotografie încărcată încă. Adaugă prima!
          </p>
        ) : (
          <ul className="space-y-2">
            {photos.map((photo, idx) => (
              <li
                key={photo.url + idx}
                className="flex items-center gap-3 rounded-md border border-border bg-muted/20 p-2"
              >
                <img
                  src={photo.url}
                  alt={photo.caption ?? ''}
                  className="h-16 w-24 flex-shrink-0 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                      {CATEGORY_LABEL[photo.category]}
                    </span>
                    <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                  </div>
                  {photo.caption && <p className="mt-1 truncate text-xs">{photo.caption}</p>}
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => moveBy(idx, -1)}
                    disabled={idx === 0 || busy}
                    aria-label="Mută în sus"
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => moveBy(idx, 1)}
                    disabled={idx === photos.length - 1 || busy}
                    aria-label="Mută în jos"
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-700 hover:bg-red-50 hover:text-red-800"
                    onClick={() => setDeletingIdx(idx)}
                    disabled={busy}
                    aria-label="Șterge fotografia"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        clubId={clubId}
        onUploaded={(next) => {
          onPhotosChange(next);
          setUploadOpen(false);
        }}
      />

      <AlertDialog open={deletingIdx !== null} onOpenChange={(o) => !o && setDeletingIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Șterge fotografia?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune este permanentă. Fotografia va fi ștearsă din galeria publică.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={busy}
              className="bg-red-700 hover:bg-red-800"
            >
              {busy ? 'Se șterge…' : 'Șterge'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: string;
  onUploaded: (next: ClubPhotoDto[]) => void;
}

function UploadDialog({ open, onOpenChange, clubId, onUploaded }: UploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [compressed, setCompressed] = useState<CompressionResult | null>(null);
  const [category, setCategory] = useState<ClubPhotoCategory>('MAIN');
  const [caption, setCaption] = useState('');
  const [working, setWorking] = useState(false);

  const reset = () => {
    setCompressed(null);
    setCategory('MAIN');
    setCaption('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Fișierul nu este o imagine.');
      return;
    }
    setWorking(true);
    try {
      const result = await compressImageFile(file);
      if (result.encodedSize > MAX_BYTES_AFTER_COMPRESSION) {
        toast.error(
          `Imaginea e prea mare după compresie (${formatBytes(result.encodedSize)}). Încearcă o imagine mai mică.`,
        );
        setCompressed(null);
      } else {
        setCompressed(result);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Compresia a eșuat.');
    } finally {
      setWorking(false);
    }
  };

  const handleSubmit = async () => {
    if (!compressed) return;
    setWorking(true);
    try {
      const { data } = await api.post<{ photos: ClubPhotoDto[] }>(`/api/clubs/${clubId}/photos`, {
        photo: compressed.dataUrl,
        category,
        ...(caption.trim() ? { caption: caption.trim() } : {}),
      });
      toast.success('Fotografie adăugată.');
      reset();
      onUploaded(data.photos);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adaugă fotografie</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {compressed ? (
            <div className="space-y-2">
              <img
                src={compressed.dataUrl}
                alt="Previzualizare"
                className="max-h-64 w-full rounded border border-border object-contain"
              />
              <p className="text-xs text-muted-foreground">
                {compressed.width}×{compressed.height} ·{' '}
                <span className="line-through">{formatBytes(compressed.originalSize)}</span> →{' '}
                {formatBytes(compressed.encodedSize)} după compresie
              </p>
              <Button variant="outline" size="sm" onClick={reset}>
                Schimbă imaginea
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-40 w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-border text-muted-foreground transition hover:border-brand-400 hover:bg-brand-50/40"
              disabled={working}
            >
              <ImageIcon className="mb-2 h-7 w-7" aria-hidden="true" />
              <p className="text-sm font-medium">Selectează o imagine</p>
              <p className="text-xs">JPEG sau PNG, max 2 MB după compresie</p>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void onFile(e)}
          />

          <div>
            <Label htmlFor="category">Categorie</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ClubPhotoCategory)}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHOTO_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="caption">Descriere (opțional)</Label>
            <Input
              id="caption"
              placeholder="Ex: Terenul central, panoramic, indoor"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={working}>
              Anulează
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={!compressed || working}>
              <Upload className="mr-1 h-4 w-4" aria-hidden="true" />
              {working ? 'Se încarcă…' : 'Adaugă'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
