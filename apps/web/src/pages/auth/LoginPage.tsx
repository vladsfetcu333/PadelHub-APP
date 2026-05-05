import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, type LoginInput, ro } from '@padel/shared';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/store/auth';
import { extractErrorMessage } from '@/lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuth((s) => s.login);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setSubmitting(true);
    try {
      await login(data);
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from);
    } catch (err) {
      toast.error(extractErrorMessage(err, ro.auth.invalidCredentials));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>{ro.auth.loginTitle}</CardTitle>
          <CardDescription>{ro.auth.loginSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{ro.auth.email}</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{ro.auth.password}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? ro.common.loading : ro.auth.submit}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {ro.auth.noAccount}{' '}
              <Link to="/register" className="font-medium text-brand-700 hover:underline">
                {ro.auth.register}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
