import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  RegisterSchema,
  type RegisterInput,
  Gender,
  PreferredSide,
  DominantHand,
  PlayFrequency,
  PlayerGoal,
  PADEL_LEVELS,
  ro,
} from '@padel/shared';
import { toast } from 'sonner';

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
import { useAuth } from '@/store/auth';
import { extractErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'account', title: ro.auth.step1Title, fields: ['email', 'password', 'username'] },
  {
    key: 'personal',
    title: ro.auth.step2Title,
    fields: ['firstName', 'lastName', 'dateOfBirth', 'gender', 'city'],
  },
  {
    key: 'padel',
    title: ro.auth.step3Title,
    fields: ['padelLevel', 'preferredSide', 'dominantHand'],
  },
  { key: 'prefs', title: ro.auth.step4Title, fields: ['playFrequency', 'goal'] },
] as const;

type FieldName = keyof RegisterInput;

export default function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useAuth((s) => s.register);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    mode: 'onTouched',
    defaultValues: {
      preferredSide: 'BOTH',
      dominantHand: 'RIGHT',
      gender: 'PREFER_NOT_TO_SAY',
      playFrequency: 'TWO_THREE_WEEK',
      goal: 'RECREATIONAL',
      padelLevel: 3.0,
    },
  });

  const next = async () => {
    const fields = STEPS[step]!.fields as readonly FieldName[];
    const ok = await form.trigger(fields as FieldName[]);
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const onSubmit = async (data: RegisterInput) => {
    setSubmitting(true);
    try {
      await registerUser(data);
      toast.success(ro.auth.accountCreated);
      navigate('/profile');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const errors = form.formState.errors;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>{ro.auth.registerTitle}</CardTitle>
          <Stepper current={step} />
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {step === 0 && <AccountStep form={form} errors={errors} />}
            {step === 1 && <PersonalStep form={form} errors={errors} />}
            {step === 2 && <PadelStep form={form} errors={errors} />}
            {step === 3 && <PrefsStep form={form} errors={errors} />}

            <div className="flex justify-between border-t border-border pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep((s) => Math.max(s - 1, 0))}
                disabled={step === 0}
              >
                {ro.auth.back}
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={next}>
                  {ro.auth.next}
                </Button>
              ) : (
                <Button type="submit" disabled={submitting}>
                  {submitting ? ro.common.loading : ro.auth.finish}
                </Button>
              )}
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {ro.auth.haveAccount}{' '}
              <Link to="/login" className="font-medium text-brand-700 hover:underline">
                {ro.auth.loginLink}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="mt-3 flex items-center gap-2 text-xs">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex flex-1 items-center gap-2">
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold',
              i < current && 'border-brand-700 bg-brand-700 text-white',
              i === current && 'border-brand-700 bg-brand-50 text-brand-900',
              i > current && 'border-border bg-background text-muted-foreground',
            )}
          >
            {i + 1}
          </div>
          <span className={cn(i === current ? 'font-medium' : 'text-muted-foreground')}>
            {s.title}
          </span>
          {i < STEPS.length - 1 && <span className="mx-1 flex-1 border-t border-border" />}
        </div>
      ))}
    </div>
  );
}

// ───── Step components ─────

type StepProps = {
  form: ReturnType<typeof useForm<RegisterInput>>;
  errors: FieldErrors<RegisterInput>;
};

function Field({
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

function AccountStep({ form, errors }: StepProps) {
  return (
    <div className="space-y-4">
      <Field label={ro.auth.email} error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...form.register('email')} />
      </Field>
      <Field label={ro.fields.username} error={errors.username?.message}>
        <Input autoComplete="username" {...form.register('username')} />
      </Field>
      <Field label={ro.auth.password} error={errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...form.register('password')} />
      </Field>
    </div>
  );
}

function PersonalStep({ form, errors }: StepProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label={ro.fields.firstName} error={errors.firstName?.message}>
        <Input {...form.register('firstName')} />
      </Field>
      <Field label={ro.fields.lastName} error={errors.lastName?.message}>
        <Input {...form.register('lastName')} />
      </Field>
      <Field label={ro.fields.dateOfBirth} error={errors.dateOfBirth?.message}>
        <Input type="date" {...form.register('dateOfBirth', { valueAsDate: true })} />
      </Field>
      <Field label={ro.fields.gender} error={errors.gender?.message}>
        <Controller
          control={form.control}
          name="gender"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
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
          )}
        />
      </Field>
      <Field label={ro.fields.city} error={errors.city?.message}>
        <Input {...form.register('city')} />
      </Field>
    </div>
  );
}

function PadelStep({ form, errors }: StepProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label={ro.fields.padelLevel} error={errors.padelLevel?.message}>
        <Controller
          control={form.control}
          name="padelLevel"
          render={({ field }) => (
            <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
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
          )}
        />
      </Field>
      <Field label={ro.fields.preferredSide} error={errors.preferredSide?.message}>
        <Controller
          control={form.control}
          name="preferredSide"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
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
          )}
        />
      </Field>
      <Field label={ro.fields.dominantHand} error={errors.dominantHand?.message}>
        <Controller
          control={form.control}
          name="dominantHand"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
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
          )}
        />
      </Field>
    </div>
  );
}

function PrefsStep({ form, errors }: StepProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label={ro.fields.playFrequency} error={errors.playFrequency?.message}>
        <Controller
          control={form.control}
          name="playFrequency"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
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
          )}
        />
      </Field>
      <Field label={ro.fields.goal} error={errors.goal?.message}>
        <Controller
          control={form.control}
          name="goal"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
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
          )}
        />
      </Field>
    </div>
  );
}
