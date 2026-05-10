import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { AvailabilityDto } from '@padel/shared';
import { ro } from '@padel/shared';
import { toast } from 'sonner';

import { api, extractErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DAYS = ro.enums.days;

export function AvailabilityEditor() {
  const [items, setItems] = useState<AvailabilityDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ dayOfWeek: 1, startTime: '18:00', endTime: '21:00' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<AvailabilityDto[]>('/api/users/me/availabilities');
      setItems(data);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const addSlot = async () => {
    setSaving(true);
    try {
      const { data } = await api.post<AvailabilityDto>('/api/users/me/availabilities', draft);
      setItems((s) => [...s, data].sort(byDayThenTime));
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/api/users/me/availabilities/${id}`);
      setItems((s) => s.filter((x) => x.id !== id));
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const grouped = DAYS.map((label, day) => ({
    day,
    label,
    slots: items.filter((s) => s.dayOfWeek === day),
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-muted/30 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <Select
            value={String(draft.dayOfWeek)}
            onValueChange={(v) => setDraft((d) => ({ ...d, dayOfWeek: Number(v) }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((d, i) => (
                <SelectItem key={i} value={String(i)}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="time"
            value={draft.startTime}
            onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
            className="w-32"
          />
          <Input
            type="time"
            value={draft.endTime}
            onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
            className="w-32"
          />
          <Button onClick={addSlot} disabled={saving}>
            <Plus className="mr-1 h-4 w-4" /> {ro.profile.addSlot}
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{ro.common.loading}</p>
      ) : (
        <div className="space-y-2">
          {grouped.map((g) => (
            <div key={g.day} className="flex items-center gap-3 border-b border-border py-2">
              <span className="w-24 text-sm font-medium">{g.label}</span>
              <div className="flex flex-1 flex-wrap gap-2">
                {g.slots.length === 0 ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : (
                  g.slots.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-2 rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-900"
                    >
                      {s.startTime} – {s.endTime}
                      <button
                        type="button"
                        onClick={() => remove(s.id)}
                        className="text-brand-700 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const byDayThenTime = (a: AvailabilityDto, b: AvailabilityDto) =>
  a.dayOfWeek !== b.dayOfWeek ? a.dayOfWeek - b.dayOfWeek : a.startTime.localeCompare(b.startTime);
