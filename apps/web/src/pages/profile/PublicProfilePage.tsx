import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { PublicUserDto } from '@padel/shared';
import { ro } from '@padel/shared';

import { api, extractErrorMessage } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PadelLevelBadge } from '@/components/padel/PadelLevelBadge';
import { PreferredSideIndicator } from '@/components/padel/PreferredSideIndicator';

export default function PublicProfilePage() {
  const { username } = useParams();
  const [user, setUser] = useState<PublicUserDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    api
      .get<PublicUserDto>(`/api/users/${username}`)
      .then((res) => setUser(res.data))
      .catch((err) => setError(extractErrorMessage(err, ro.errors.notFound)))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <p className="p-8 text-muted-foreground">{ro.common.loading}</p>;
  if (error)
    return (
      <div className="mx-auto max-w-md p-8">
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-amber-900">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  if (!user) return null;

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() || 'U';

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-brand-950 text-lg font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>
              {user.firstName} {user.lastName}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              @{user.username} · {user.city}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <PadelLevelBadge level={user.padelLevel} />
              <PreferredSideIndicator side={user.preferredSide} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {user.bio && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {ro.fields.bio}
              </p>
              <p>{user.bio}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Info label={ro.fields.dominantHand} value={ro.enums.dominantHand[user.dominantHand]} />
            <Info
              label={ro.fields.playStyle}
              value={user.playStyle ? ro.enums.playStyle[user.playStyle] : '—'}
            />
            <Info
              label={ro.fields.playFrequency}
              value={ro.enums.playFrequency[user.playFrequency]}
            />
            <Info label={ro.fields.goal} value={ro.enums.goal[user.goal]} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
