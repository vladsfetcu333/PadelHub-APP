import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ro,
  TournamentFormat,
  AmericanoPairingMode,
  type ClubListResponse,
  type TournamentDto,
} from '@padel/shared';
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

export default function NewTournamentPage() {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<Array<{ id: string; name: string; city: string }>>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clubId, setClubId] = useState('');
  const [format, setFormat] = useState<(typeof TournamentFormat)[number]>('AMERICANO');
  const [pairingMode, setPairingMode] = useState<(typeof AmericanoPairingMode)[number]>('ROTATION');
  const defaultDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(18, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  })();
  const [startDate, setStartDate] = useState(defaultDate);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [numberOfRounds, setNumberOfRounds] = useState<number | ''>(7);
  const [numberOfCourts, setNumberOfCourts] = useState(2);
  const [allowGuests, setAllowGuests] = useState(true);
  const [winPoints, setWinPoints] = useState(3);
  const [drawPoints, setDrawPoints] = useState(1);
  const [lossPoints, setLossPoints] = useState(0);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<ClubListResponse>('/api/clubs', { params: { pageSize: 50 } })
      .then((res) =>
        setClubs(res.data.items.map((c) => ({ id: c.id, name: c.name, city: c.city }))),
      )
      .catch((err) => toast.error(extractErrorMessage(err)));
  }, []);

  const submit = async () => {
    if (!clubId) return toast.error('Alege un club');
    if (!name) return toast.error('Numele turneului este obligatoriu');
    setSubmitting(true);
    try {
      const { data } = await api.post<TournamentDto>('/api/tournaments', {
        name,
        description: description || null,
        format,
        pairingMode,
        clubId,
        startDate: new Date(startDate).toISOString(),
        maxPlayers,
        numberOfRounds: typeof numberOfRounds === 'number' ? numberOfRounds : null,
        numberOfCourts,
        winPoints,
        drawPoints,
        lossPoints,
        allowGuests,
      });
      toast.success('Turneu creat');
      navigate(`/tournaments/${data.id}/manage`);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{ro.tournaments.create}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nume turneu</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Cupa de Iarnă"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{ro.tournaments.descriptionLabel}</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              placeholder={ro.tournaments.descriptionPlaceholder}
              className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Club</Label>
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
              <Label>{ro.tournaments.format}</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TournamentFormat.map((f) => (
                    <SelectItem key={f} value={f}>
                      {ro.tournaments.formatNames[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {format === 'AMERICANO' && (
              <div className="space-y-1.5">
                <Label>{ro.tournaments.pairingMode}</Label>
                <Select
                  value={pairingMode}
                  onValueChange={(v) => setPairingMode(v as typeof pairingMode)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AmericanoPairingMode.map((p) => (
                      <SelectItem key={p} value={p}>
                        {ro.tournaments.pairingNames[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{ro.tournaments.startDate}</Label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{ro.tournaments.maxPlayers}</Label>
              <Input
                type="number"
                min={4}
                max={64}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{ro.tournaments.rounds}</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={numberOfRounds}
                onChange={(e) => setNumberOfRounds(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{ro.tournaments.courts}</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={numberOfCourts}
                onChange={(e) => setNumberOfCourts(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>{ro.tournaments.winPoints}</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={winPoints}
                onChange={(e) => setWinPoints(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{ro.tournaments.drawPoints}</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={drawPoints}
                onChange={(e) => setDrawPoints(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{ro.tournaments.lossPoints}</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={lossPoints}
                onChange={(e) => setLossPoints(Number(e.target.value))}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allowGuests}
              onChange={(e) => setAllowGuests(e.target.checked)}
              className="h-4 w-4 rounded border-input text-brand-700"
            />
            {ro.tournaments.allowGuests}
          </label>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? ro.common.loading : ro.tournaments.create}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
