import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { ro } from '@padel/shared';
import { Button } from '@/components/ui/button';

/**
 * 404 page — rendered by the catch-all route in App.tsx.
 * Mirrors the visual language of the Landing hero so it feels intentional
 * rather than a stack trace.
 */
export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <Compass className="h-8 w-8" aria-hidden="true" />
      </div>
      <p className="mb-2 text-sm font-medium uppercase tracking-widest text-brand-700">
        {ro.notFoundPage.code}
      </p>
      <h1 className="mb-4 text-3xl font-bold text-slate-900">{ro.notFoundPage.title}</h1>
      <p className="mb-8 text-slate-600">{ro.notFoundPage.description}</p>
      <Button asChild>
        <Link to="/">{ro.common.backHome}</Link>
      </Button>
    </div>
  );
}
