import { z } from 'zod';
import {
  Gender,
  PreferredSide,
  DominantHand,
  PlayFrequency,
  PlayerGoal,
  PADEL_LEVELS,
  MIN_AGE_YEARS,
} from '../constants/enums';

const yearsBetween = (date: Date, now: Date) => {
  const ms = now.getTime() - date.getTime();
  return ms / (365.25 * 24 * 60 * 60 * 1000);
};

export const PasswordSchema = z
  .string()
  .min(8, 'Parola trebuie să aibă cel puțin 8 caractere')
  .regex(/[A-Za-z]/, 'Parola trebuie să conțină cel puțin o literă')
  .regex(/[0-9]/, 'Parola trebuie să conțină cel puțin o cifră');

export const UsernameSchema = z
  .string()
  .min(3, 'Numele de utilizator trebuie să aibă cel puțin 3 caractere')
  .max(20, 'Numele de utilizator nu poate depăși 20 de caractere')
  .regex(/^[A-Za-z0-9_]+$/, 'Doar litere, cifre și underscore sunt permise');

export const PadelLevelSchema = z
  .number()
  .refine((v) => (PADEL_LEVELS as readonly number[]).includes(v), {
    message: 'Nivelul trebuie să fie între 1.0 și 7.0, în pași de 0.5',
  });

export const RegisterSchema = z.object({
  email: z.string().email('Adresă de email invalidă'),
  password: PasswordSchema,
  username: UsernameSchema,
  firstName: z.string().min(1, 'Prenumele este obligatoriu').max(50),
  lastName: z.string().min(1, 'Numele este obligatoriu').max(50),
  dateOfBirth: z.coerce.date().refine((d) => yearsBetween(d, new Date()) >= MIN_AGE_YEARS, {
    message: `Trebuie să ai cel puțin ${MIN_AGE_YEARS} ani`,
  }),
  gender: z.enum(Gender),
  city: z.string().min(1, 'Orașul este obligatoriu').max(80),
  padelLevel: PadelLevelSchema,
  preferredSide: z.enum(PreferredSide),
  dominantHand: z.enum(DominantHand),
  playFrequency: z.enum(PlayFrequency),
  goal: z.enum(PlayerGoal),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Adresă de email invalidă'),
  password: z.string().min(1, 'Parola este obligatorie'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Parola curentă este obligatorie'),
  newPassword: PasswordSchema,
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const RequestPasswordResetSchema = z.object({
  email: z.string().email('Adresă de email invalidă'),
});

export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetSchema>;
