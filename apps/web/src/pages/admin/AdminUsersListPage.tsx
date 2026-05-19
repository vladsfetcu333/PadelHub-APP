/**
 * Admin user list — Phase 5 Part D.
 *
 * GET /api/admin/users with server-side search/filter/sort/pagination.
 * Sort & filter changes refetch from the server (in-memory state, no URL
 * params yet to keep the URL clean).
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { AdminUserListResponse, UserRole } from '@padel/shared';

import { api, extractErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PAGE_SIZE = 20;
const ALL = '__all__';

const ROLE_LABEL: Record<UserRole, string> = {
  PLAYER: 'Jucător',
  COACH: 'Antrenor',
  CLUB_OWNER: 'Proprietar club',
  ADMIN: 'Administrator',
};

type StatusFilter = 'active' | 'suspended' | 'unverified';
type SortKey = 'createdAt' | 'username' | 'email' | 'updatedAt';

export default function AdminUsersListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminUserListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | typeof ALL>(ALL);
  const [statusFilter, setStatusFilter] = useState<StatusFilter | typeof ALL>(ALL);
  const [sortBy, setSortBy] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  // Debounce the search box (300ms) so we don't spam the API on each keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Refetch whenever any filter/sort/page or the debounced search changes.
  useEffect(() => {
    setLoading(true);
    const params: Record<string, unknown> = {
      page,
      limit: PAGE_SIZE,
      sortBy,
      sortDir,
    };
    if (debouncedSearch) params['search'] = debouncedSearch;
    if (roleFilter !== ALL) params['role'] = roleFilter;
    if (statusFilter !== ALL) params['status'] = statusFilter;

    api
      .get<AdminUserListResponse>('/api/admin/users', { params })
      .then((res) => setData(res.data))
      .catch((err) => toast.error(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [debouncedSearch, roleFilter, statusFilter, sortBy, sortDir, page]);

  // Reset to page 1 whenever a filter that narrows the result set changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Utilizatori</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Caută, filtrează și gestionează toate conturile platformei.
      </p>

      {/* Toolbar — sticky on scroll so filters stay accessible */}
      <Card className="sticky top-16 z-30 mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div className="relative min-w-[200px] flex-1">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Caută după nume, username sau email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-muted-foreground">Rol</label>
            <Select
              value={roleFilter}
              onValueChange={(v) => setRoleFilter(v as UserRole | typeof ALL)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toate rolurile</SelectItem>
                {(['PLAYER', 'COACH', 'CLUB_OWNER', 'ADMIN'] as UserRole[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-muted-foreground">Status</label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter | typeof ALL)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toate</SelectItem>
                <SelectItem value="active">Activ</SelectItem>
                <SelectItem value="suspended">Suspendat</SelectItem>
                <SelectItem value="unverified">Neverificat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-muted-foreground">Sortează</label>
            <div className="flex gap-1">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Dată înregistrare</SelectItem>
                  <SelectItem value="username">Username</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="updatedAt">Ultima activitate</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                title={sortDir === 'asc' ? 'Crescător' : 'Descrescător'}
                aria-label={sortDir === 'asc' ? 'Ordonare crescătoare' : 'Ordonare descrescătoare'}
              >
                {sortDir === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            {loading ? 'Se încarcă…' : `${data?.total ?? 0} utilizatori`}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!data || data.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {loading ? 'Se încarcă…' : 'Niciun utilizator potrivit filtrelor.'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-2 text-left">Utilizator</th>
                  <th className="py-2 pr-2 text-left">Email</th>
                  <th className="py-2 pr-2 text-left">Rol</th>
                  <th className="py-2 pr-2 text-right">Nivel</th>
                  <th className="py-2 pr-2 text-right">Meciuri</th>
                  <th className="py-2 pr-2 text-left">Înreg.</th>
                  <th className="py-2 pr-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr
                    key={u.id}
                    className="cursor-pointer border-b border-border/40 transition hover:bg-muted/40"
                    onClick={() => navigate(`/admin/users/${u.id}`)}
                  >
                    <td className="py-2 pr-2">
                      <div className="font-medium">
                        {u.firstName} {u.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">@{u.username}</div>
                    </td>
                    <td className="py-2 pr-2 text-xs">{u.email}</td>
                    <td className="py-2 pr-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td className="py-2 pr-2 text-right font-mono text-xs">
                      {u.padelLevel.toFixed(1)}
                    </td>
                    <td className="py-2 pr-2 text-right font-mono text-xs">{u.matchCount}</td>
                    <td className="py-2 pr-2 text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="py-2 pr-2">
                      <UserStatusBadge user={u} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
        {data && data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t px-6 py-3 text-sm">
            <span className="text-xs text-muted-foreground">
              Pagina {data.page} din {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Pagina precedentă"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Pagina următoare"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function UserStatusBadge({
  user,
}: {
  user: { isSuspended: boolean; isActive: boolean; isVerified: boolean };
}) {
  if (user.isSuspended) {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        Suspendat
      </span>
    );
  }
  if (!user.isActive) {
    return (
      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600">
        Dezactivat
      </span>
    );
  }
  if (!user.isVerified) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        Neverificat
      </span>
    );
  }
  return (
    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
      Activ
    </span>
  );
}
