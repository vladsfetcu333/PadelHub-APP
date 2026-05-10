import { useNavigate } from 'react-router-dom';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClubCreateSchema, type ClubCreateInput, type ClubDto, ro } from '@padel/shared';
import { toast } from 'sonner';

import { api, extractErrorMessage } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function NewClubPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClubCreateInput>({
    resolver: zodResolver(ClubCreateSchema) as Resolver<ClubCreateInput>,
    defaultValues: {
      hasLockerRoom: false,
      hasShowers: false,
      hasCafe: false,
      hasParking: false,
      hasShop: false,
      hasSchool: false,
      hasRacketRental: false,
      photos: [],
    },
  });

  const onSubmit = async (data: ClubCreateInput) => {
    try {
      const { data: club } = await api.post<ClubDto>('/api/clubs', data);
      toast.success(`Club creat: ${club.name}`);
      navigate(`/clubs/${club.slug}`);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{ro.clubs.addClub}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Row label="Nume" error={errors.name?.message}>
              <Input {...register('name')} />
            </Row>
            <Row label="Adresă" error={errors.address?.message}>
              <Input {...register('address')} />
            </Row>
            <Row label={ro.fields.city} error={errors.city?.message}>
              <Input {...register('city')} />
            </Row>

            <div className="grid grid-cols-2 gap-3">
              <Row label="Latitudine" error={errors.latitude?.message}>
                <Input
                  type="number"
                  step="0.0001"
                  {...register('latitude', { valueAsNumber: true })}
                />
              </Row>
              <Row label="Longitudine" error={errors.longitude?.message}>
                <Input
                  type="number"
                  step="0.0001"
                  {...register('longitude', { valueAsNumber: true })}
                />
              </Row>
            </div>

            <Row label="Telefon" error={errors.phone?.message}>
              <Input {...register('phone')} />
            </Row>
            <Row label="Website" error={errors.website?.message}>
              <Input type="url" placeholder="https://…" {...register('website')} />
            </Row>
            <Row label="Descriere" error={errors.description?.message}>
              <textarea
                {...register('description')}
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Row>

            <fieldset className="space-y-2 rounded-md border border-border p-3">
              <legend className="px-1 text-sm font-semibold">{ro.clubs.facilities}</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(
                  [
                    ['hasLockerRoom', ro.facilities.hasLockerRoom],
                    ['hasShowers', ro.facilities.hasShowers],
                    ['hasCafe', ro.facilities.hasCafe],
                    ['hasParking', ro.facilities.hasParking],
                    ['hasShop', ro.facilities.hasShop],
                    ['hasSchool', ro.facilities.hasSchool],
                    ['hasRacketRental', ro.facilities.hasRacketRental],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      {...register(key)}
                      className="h-4 w-4 rounded border-input text-brand-700"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? ro.common.loading : ro.common.save}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
