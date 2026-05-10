import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ro, type ClubListResponse, type OpenMatchDto } from '@padel/shared';
import { toast } from 'sonner';

import { api, extractErrorMessage } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ClubOption {
  id: string;
  name: string;
  city: string;
}

export default function NewOpenMatchPage() {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [clubId, setClubId] = useState('');
  // Default: 2 days from now at 18:00 — clamp to local time
  const defaultDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(18, 0, 0, 0);
    return d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm" for datetime-local
  })();
  const [scheduledAt, setScheduledAt] = useState(defaultDate);
  const [duration, setDuration] = useState(90);
  const [levelMin, setLevelMin] = useState('');
  const [levelMax, setLevelMax] = useState('');
  const [genderRequired, setGenderRequired] = useState<'ANY' | 'MALE_ONLY' | 'FEMALE_ONLY'>('ANY');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    api
      .get<ClubListResponse>('/api/clubs', { params: { pageSize: 50 } })
      .then((res) =>
        setClubs(res.data.items.map((c) => ({ id: c.id, name: c.name, city: c.city }))),
      )
      .catch((err) => toast.error(extractErrorMessage(err)));
  }, []);

  const submit = async () => {
    if (!clubId) {
      toast.error('Alege un club');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post<OpenMatchDto>('/api/open-matches', {
        clubId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: duration,
        levelMin: levelMin ? Number(levelMin) : null,
        levelMax: levelMax ? Number(levelMax) : null,
        genderRequired,
        notes: notes || null,
      });
      toast.success(ro.openMatches.matchCreated);
      navigate(`/open-matches/${data.id}`);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{ro.openMatches.create}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>{ro.openMatches.fields.club}</Label>
            <Select value={clubId} onValueChange={setClubId}>
              <SelectTrigger>
                <SelectValue placeholder="Alege un club" />
              </SelectTrigger>
              <SelectContent>
                {clubs.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} · {c.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{ro.openMatches.fields.scheduledAt}</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{ro.openMatches.fields.duration}</Label>
              <Input
                type="number"
                min={30}
                max={240}
                step={15}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{ro.openMatches.filterLevelMin}</Label>
              <Input
                type="number"
                min="1"
                max="7"
                step="0.5"
                value={levelMin}
                onChange={(e) => setLevelMin(e.target.value)}
                placeholder="orice"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{ro.openMatches.filterLevelMax}</Label>
              <Input
                type="number"
                min="1"
                max="7"
                step="0.5"
                value={levelMax}
                onChange={(e) => setLevelMax(e.target.value)}
                placeholder="orice"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Gen</Label>
            <Select
              value={genderRequired}
              onValueChange={(v) => setGenderRequired(v as typeof genderRequired)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Oricine</SelectItem>
                <SelectItem value="MALE_ONLY">Doar bărbați</SelectItem>
                <SelectItem value="FEMALE_ONLY">Doar femei</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{ro.openMatches.notesLabel}</Label>
            <textarea
              value={notes}
              maxLength={1000}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <Button onClick={submit} disabled={submitting}>
            {submitting ? ro.common.loading : ro.openMatches.create}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
