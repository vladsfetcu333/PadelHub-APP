/**
 * Admin user detail — Phase 5 Part D.
 *
 * GET /api/admin/users/:id, plus suspend/unsuspend/reset-password actions.
 * Destructive actions use the shadcn AlertDialog primitive for explicit
 * confirmation.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronLeft,
  Copy,
  KeyRound,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdminUserDetailDto } from '@padel/shared';

import { api, extractErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useAuth } from '@/store/auth';

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const me = useAuth((s) => s.user);
  const [user, setUser] = useState<AdminUserDetailDto | null>(null);
  const [loading, setLoading] = useState(true);

  // Action state — separate flags so each AlertDialog disables only its
  // own buttons while the request is in flight.
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [unsuspendOpen, setUnsuspendOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  // After a successful reset we display the temp password until the admin
  // dismisses it manually — never auto-clears.
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const refetch = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await api.get<AdminUserDetailDto>(`/api/admin/users/${userId}`);
      setUser(res.data);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const isSelf = me?.id === user?.id;

  const handleSuspend = async () => {
    if (!user) return;
    if (reason.trim().length < 3) {
      toast.error('Motivul trebuie să aibă cel puțin 3 caractere.');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/api/admin/users/${user.id}/suspend`, { reason: reason.trim() });
      toast.success('Utilizator suspendat.');
      setSuspendOpen(false);
      setReason('');
      await refetch();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleUnsuspend = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await api.post(`/api/admin/users/${user.id}/unsuspend`);
      toast.success('Suspendarea a fost ridicată.');
      setUnsuspendOpen(false);
      await refetch();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const res = await api.post<{ newPassword: string }>(
        `/api/admin/users/${user.id}/reset-password`,
        { confirm: true },
      );
      setNewPassword(res.data.newPassword);
      setResetOpen(false);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copiat în clipboard.');
    } catch {
      toast.error('Nu am putut copia în clipboard.');
    }
  };

  if (loading && !user) {
    return <p className="p-8 text-muted-foreground">Se încarcă utilizatorul…</p>;
  }
  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')} className="mb-3">
        <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" /> Înapoi la utilizatori
      </Button>

      <h1 className="mb-1 text-2xl font-bold">
        {user.firstName} {user.lastName}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        <Link to={`/profile/${user.username}`} className="hover:underline">
          @{user.username}
        </Link>{' '}
        · {user.email} · {user.city}
      </p>

      {user.isSuspended && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-3 py-4 text-sm text-red-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Cont suspendat</p>
              <p className="mt-1 text-red-800">
                <strong>Motiv:</strong> {user.suspendedReason ?? '—'}
              </p>
              {user.suspendedAt && (
                <p className="mt-0.5 text-xs text-red-700">
                  Suspendat la {new Date(user.suspendedAt).toLocaleString('ro-RO')}
                  {user.suspendedByUser && ` de @${user.suspendedByUser.username}`}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {newPassword && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <CardContent className="py-4 text-sm">
            <p className="mb-2 font-semibold text-amber-900">
              Parolă nouă temporară — comunic-o utilizatorului în mod sigur:
            </p>
            <div className="flex items-center gap-2">
              <code className="rounded bg-white px-3 py-1.5 font-mono text-base tracking-wider">
                {newPassword}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(newPassword)}
                aria-label="Copiază parola"
              >
                <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Copiază
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setNewPassword(null)}>
                Ascunde
              </Button>
            </div>
            <p className="mt-2 text-xs text-amber-800">
              Această parolă apare o singură dată. După ce o ascunzi, nu o mai poți recupera.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Left: profile facts */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profil</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Field label="Rol" value={user.role} />
              <Field label="Nivel padel" value={user.padelLevel.toFixed(1)} />
              <Field label="Gen" value={user.gender} />
              <Field label="Mâna dominantă" value={user.dominantHand} />
              <Field label="Parte preferată" value={user.preferredSide} />
              <Field label="Telefon" value={user.phone ?? '—'} />
              <Field label="Glicko rating" value={Math.round(user.glickoRating)} />
              <Field label="RD" value={Math.round(user.glickoRD)} />
              <Field label="Verificat" value={user.isVerified ? 'Da' : 'Nu'} />
              <Field
                label="Email verificat"
                value={
                  user.emailVerifiedAt
                    ? new Date(user.emailVerifiedAt).toLocaleDateString('ro-RO')
                    : '—'
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activitate</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Field label="Meciuri totale" value={user.recentMatchCount} />
              <Field
                label="Ultimul meci"
                value={
                  user.lastMatchAt
                    ? new Date(user.lastMatchAt).toLocaleString('ro-RO')
                    : 'Niciun meci'
                }
              />
              <Field label="Notificări" value={user.notificationsCount} />
              <Field
                label="Înregistrat"
                value={new Date(user.createdAt).toLocaleDateString('ro-RO')}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: actions */}
        <Card className="self-start">
          <CardHeader>
            <CardTitle className="text-base">Acțiuni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setResetOpen(true)}
              disabled={isSelf || busy}
            >
              <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
              Resetează parola
            </Button>

            {user.isSuspended ? (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setUnsuspendOpen(true)}
                disabled={busy}
              >
                <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                Reactivează cont
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => setSuspendOpen(true)}
                disabled={isSelf || busy}
                title={isSelf ? 'Nu te poți suspenda singur' : undefined}
              >
                <ShieldAlert className="mr-2 h-4 w-4" aria-hidden="true" />
                Suspendă cont
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => void refetch()}
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Reîncarcă
            </Button>

            {isSelf && (
              <p className="pt-2 text-xs text-muted-foreground">
                Acesta e contul tău — unele acțiuni sunt blocate.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Suspend dialog ─────────────────────────────────────────── */}
      <AlertDialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspendă contul lui @{user.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              Utilizatorul nu se va mai putea autentifica până când nu este reactivat. O notificare
              va fi trimisă cu motivul de mai jos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="suspend-reason">Motiv (vizibil utilizatorului)</Label>
            <Input
              id="suspend-reason"
              placeholder="Ex: Comportament necorespunzător în meciuri…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleSuspend();
              }}
              disabled={busy || reason.trim().length < 3}
              className="bg-red-700 hover:bg-red-800"
            >
              {busy ? 'Se suspendă…' : 'Suspendă'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Unsuspend dialog ───────────────────────────────────────── */}
      <AlertDialog open={unsuspendOpen} onOpenChange={setUnsuspendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivează contul lui @{user.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              Utilizatorul se va putea autentifica din nou. O notificare îi va fi trimisă.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleUnsuspend();
              }}
              disabled={busy}
            >
              {busy ? 'Se reactivează…' : 'Reactivează'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Reset password dialog ──────────────────────────────────── */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetează parola lui @{user.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              Vei primi o parolă temporară aleatoare de 12 caractere. Parola actuală nu va mai
              funcționa. Asigură-te că o transmiți utilizatorului prin canal sigur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleResetPassword();
              }}
              disabled={busy}
              className="bg-amber-700 hover:bg-amber-800"
            >
              {busy ? 'Se resetează…' : 'Resetează parola'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </>
  );
}
