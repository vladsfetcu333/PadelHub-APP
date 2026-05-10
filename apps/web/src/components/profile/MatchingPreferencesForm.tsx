import { useState } from 'react';
import type { SelfUserDto, GenderFilter, UpdateProfileInput } from '@padel/shared';
import { ro } from '@padel/shared';
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

export function MatchingPreferencesForm({ user }: { user: SelfUserDto }) {
  const setUser = useAuth((s) => s.setUser);
  const [maxLevelDiff, setMaxLevelDiff] = useState<string>(
    user.prefMaxLevelDiff != null ? String(user.prefMaxLevelDiff) : '',
  );
  const [genderFilter, setGenderFilter] = useState<GenderFilter>(user.prefGenderFilter);
  const [ageMin, setAgeMin] = useState<string>(
    user.prefAgeMin != null ? String(user.prefAgeMin) : '',
  );
  const [ageMax, setAgeMax] = useState<string>(
    user.prefAgeMax != null ? String(user.prefAgeMax) : '',
  );
  const [requireGoalMatch, setRequireGoalMatch] = useState(user.prefRequireGoalMatch);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const payload: UpdateProfileInput = {
      prefMaxLevelDiff: maxLevelDiff === '' ? null : Number(maxLevelDiff),
      prefGenderFilter: genderFilter,
      prefAgeMin: ageMin === '' ? null : Number(ageMin),
      prefAgeMax: ageMax === '' ? null : Number(ageMax),
      prefRequireGoalMatch: requireGoalMatch,
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
    <div className="space-y-4">
      <h3 className="text-base font-semibold">{ro.profile.matchingPrefsTitle}</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{ro.profile.maxLevelDiff}</Label>
          <Input
            type="number"
            min="0"
            max="6"
            step="0.5"
            value={maxLevelDiff}
            onChange={(e) => setMaxLevelDiff(e.target.value)}
            placeholder="orice"
          />
        </div>
        <div className="space-y-1.5">
          <Label>{ro.profile.genderFilter}</Label>
          <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v as GenderFilter)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ANY">Oricare</SelectItem>
              <SelectItem value="MALE_ONLY">Doar bărbați</SelectItem>
              <SelectItem value="FEMALE_ONLY">Doar femei</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{ro.profile.ageRange} (min)</Label>
          <Input
            type="number"
            min="14"
            max="120"
            value={ageMin}
            onChange={(e) => setAgeMin(e.target.value)}
            placeholder="orice"
          />
        </div>
        <div className="space-y-1.5">
          <Label>{ro.profile.ageRange} (max)</Label>
          <Input
            type="number"
            min="14"
            max="120"
            value={ageMax}
            onChange={(e) => setAgeMax(e.target.value)}
            placeholder="orice"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={requireGoalMatch}
          onChange={(e) => setRequireGoalMatch(e.target.checked)}
          className="h-4 w-4 rounded border-input text-brand-700 focus:ring-brand-700"
        />
        {ro.profile.requireGoalMatch}
      </label>

      <Button onClick={save} disabled={saving}>
        {saving ? ro.common.loading : ro.profile.save}
      </Button>
    </div>
  );
}
