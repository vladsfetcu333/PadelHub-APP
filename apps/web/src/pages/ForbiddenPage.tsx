import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { ro } from '@padel/shared';
import { Button } from '@/components/ui/button';

/**
 * 403 page — rendered when {@link RequireRole} blocks access because the
 * authenticated user lacks the required role. Replaces the previous silent
 * redirect to "/" so users understand why they bounced.
 */
export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <ShieldAlert className="h-8 w-8" aria-hidden="true" />
      </div>
      <p className="mb-2 text-sm font-medium uppercase tracking-widest text-amber-700">
        {ro.forbiddenPage.code}
      </p>
      <h1 className="mb-4 text-3xl font-bold text-slate-900">{ro.forbiddenPage.title}</h1>
      <p className="mb-8 text-slate-600">{ro.forbiddenPage.description}</p>
      <Button asChild>
        <Link to="/">{ro.common.backHome}</Link>
      </Button>
    </div>
  );
}
