import { useState } from 'react';
import {
  Gender,
  PreferredSide,
  DominantHand,
  PlayStyle,
  PlayFrequency,
  PlayerGoal,
  PADEL_LEVELS,
  BIO_MAX_CHARS,
  type SelfUserDto,
  type UpdateProfileInput,
  type ProfileVisibility,
  ro,
} from '@padel/shared';
import { toast } from 'sonner';

import { api, extractErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/store/auth';

export function EditProfileForm({ user }: { user: SelfUserDto }) {
  const setUser = useAuth((s) => s.setUser);
  const [v, setV] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    city: user.city,
    bio: user.bio ?? '',
    phone: user.phone ?? '',
    padelLevel: user.padelLevel,
    preferredSide: user.preferredSide,
    dominantHand: user.dominantHand,
    playStyle: user.playStyle ?? '',
    playFrequency: user.playFrequency,
    goal: user.goal,
    gender: user.gender,
    profileVisibility: user.profileVisibility,
  });
  const [saving, setSaving] = useState(false);

  const set =
    <K extends keyof typeof v>(k: K) =>
    (val: (typeof v)[K]) =>
      setV((prev) => ({ ...prev, [k]: val }));

  const save = async () => {
    setSaving(true);
    const payload: UpdateProfileInput = {
      firstName: v.firstName,
      lastName: v.lastName,
      city: v.city,
      bio: v.bio.length > 0 ? v.bio : null,
      phone: v.phone.length > 0 ? v.phone : null,
      padelLevel: v.padelLevel,
      preferredSide: v.preferredSide,
      dominantHand: v.dominantHand,
      playStyle: v.playStyle === '' ? null : (v.playStyle as (typeof PlayStyle)[number]),
      playFrequency: v.playFrequency,
      goal: v.goal,
      gender: v.gender,
      profileVisibility: v.profileVisibility,
    };
    try {
      const { data } = await api.patch<SelfUserDto>('/api/users/me', payload);
      setUser(data);
      toast.success(ro.profile.saved);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow label={ro.fields.firstName}>
          <Input value={v.firstName} onChange={(e) => set('firstName')(e.target.value)} />
        </FormRow>
        <FormRow label={ro.fields.lastName}>
          <Input value={v.lastName} onChange={(e) => set('lastName')(e.target.value)} />
        </FormRow>
        <FormRow label={ro.fields.city}>
          <Input value={v.city} onChange={(e) => set('city')(e.target.value)} />
        </FormRow>
        <FormRow label={ro.fields.phone}>
          <Input value={v.phone} onChange={(e) => set('phone')(e.target.value)} />
        </FormRow>
        <FormRow label={ro.fields.gender}>
          <Select value={v.gender} onValueChange={(val) => set('gender')(val as typeof v.gender)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Gender.map((g) => (
                <SelectItem key={g} value={g}>
                  {ro.enums.gender[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>
        <FormRow label="Vizibilitate profil">
          <Select
            value={v.profileVisibility}
            onValueChange={(val) => set('profileVisibility')(val as ProfileVisibility)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PUBLIC">Public</SelectItem>
              <SelectItem value="FRIENDS_ONLY">Doar prieteni</SelectItem>
              <SelectItem value="PRIVATE">Privat</SelectItem>
            </SelectContent>
          </Select>
        </FormRow>
        <FormRow label={ro.fields.bio} className="sm:col-span-2">
          <textarea
            value={v.bio}
            maxLength={BIO_MAX_CHARS}
            onChange={(e) => set('bio')(e.target.value)}
            className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-right text-xs text-muted-foreground">
            {v.bio.length}/{BIO_MAX_CHARS}
          </p>
        </FormRow>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow label={ro.fields.padelLevel}>
          <Select
            value={String(v.padelLevel)}
            onValueChange={(val) => set('padelLevel')(Number(val))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PADEL_LEVELS.map((l) => (
                <SelectItem key={l} value={String(l)}>
                  {l.toFixed(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>
        <FormRow label={ro.fields.preferredSide}>
          <Select
            value={v.preferredSide}
            onValueChange={(val) => set('preferredSide')(val as typeof v.preferredSide)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PreferredSide.map((s) => (
                <SelectItem key={s} value={s}>
                  {ro.enums.preferredSide[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>
        <FormRow label={ro.fields.dominantHand}>
          <Select
            value={v.dominantHand}
            onValueChange={(val) => set('dominantHand')(val as typeof v.dominantHand)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DominantHand.map((h) => (
                <SelectItem key={h} value={h}>
                  {ro.enums.dominantHand[h]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>
        <FormRow label={ro.fields.playStyle}>
          <Select
            value={v.playStyle === '' ? '__none__' : v.playStyle}
            onValueChange={(val) =>
              set('playStyle')(val === '__none__' ? '' : (val as (typeof PlayStyle)[number]))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nespecificat</SelectItem>
              {PlayStyle.map((p) => (
                <SelectItem key={p} value={p}>
                  {ro.enums.playStyle[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>
        <FormRow label={ro.fields.playFrequency}>
          <Select
            value={v.playFrequency}
            onValueChange={(val) => set('playFrequency')(val as typeof v.playFrequency)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PlayFrequency.map((f) => (
                <SelectItem key={f} value={f}>
                  {ro.enums.playFrequency[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>
        <FormRow label={ro.fields.goal}>
          <Select value={v.goal} onValueChange={(val) => set('goal')(val as typeof v.goal)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PlayerGoal.map((g) => (
                <SelectItem key={g} value={g}>
                  {ro.enums.goal[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>
      </section>

      <Button onClick={save} disabled={saving}>
        {saving ? ro.common.loading : ro.profile.save}
      </Button>
    </div>
  );
}

function FormRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
