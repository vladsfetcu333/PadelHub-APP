import { useSearchParams } from 'react-router-dom';
import { ro } from '@padel/shared';

import { useAuth } from '@/store/auth';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PadelLevelBadge } from '@/components/padel/PadelLevelBadge';
import { PreferredSideIndicator } from '@/components/padel/PreferredSideIndicator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EditProfileForm } from '@/components/profile/EditProfileForm';
import { AvailabilityEditor } from '@/components/profile/AvailabilityEditor';
import { MatchingPreferencesForm } from '@/components/profile/MatchingPreferencesForm';
import { RatingTab } from '@/components/profile/RatingTab';

export default function ProfilePage() {
  const user = useAuth((s) => s.user);
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab =
    tabParam === 'availability' ? 'availability' : tabParam === 'rating' ? 'rating' : 'profile';

  if (!user) return null;

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() || 'U';

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-6 flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-brand-950 text-lg font-semibold text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            @{user.username} · {user.city}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <PadelLevelBadge level={user.padelLevel} />
            <PreferredSideIndicator side={user.preferredSide} />
          </div>
        </div>
      </header>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = new URLSearchParams(params);
          if (v === 'profile') next.delete('tab');
          else next.set('tab', v);
          setParams(next, { replace: true });
        }}
      >
        <TabsList>
          <TabsTrigger value="profile">{ro.profile.tabProfile}</TabsTrigger>
          <TabsTrigger value="availability">{ro.profile.tabAvailability}</TabsTrigger>
          <TabsTrigger value="rating">{ro.rating.tabTitle}</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{ro.profile.tabProfile}</CardTitle>
            </CardHeader>
            <CardContent>
              <EditProfileForm user={user} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="availability">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{ro.profile.tabAvailability}</CardTitle>
              </CardHeader>
              <CardContent>
                <AvailabilityEditor />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <MatchingPreferencesForm user={user} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="rating">
          <RatingTab user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
