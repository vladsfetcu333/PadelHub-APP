import { Link } from 'react-router-dom';
import { ro } from '@padel/shared';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/store/auth';

export default function Landing() {
  const user = useAuth((s) => s.user);

  const features = [
    { title: ro.landing.feature1Title, desc: ro.landing.feature1Desc },
    { title: ro.landing.feature2Title, desc: ro.landing.feature2Desc },
    { title: ro.landing.feature3Title, desc: ro.landing.feature3Desc },
  ];

  return (
    <div className="flex flex-col">
      <section className="bg-gradient-to-br from-brand-950 to-brand-700 px-4 py-24 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-block text-sm font-medium uppercase tracking-widest text-brand-200">
            {ro.app.tagline}
          </span>
          <h1 className="mb-6 text-5xl font-bold leading-tight">{ro.landing.heroTitle}</h1>
          <p className="mx-auto mb-10 max-w-xl text-xl text-brand-100">{ro.landing.heroSubtitle}</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            {!user && (
              <Button size="lg" variant="secondary" asChild>
                <Link to="/register">{ro.landing.ctaSignup}</Link>
              </Button>
            )}
            <Button
              size="lg"
              variant={user ? 'secondary' : 'outline'}
              className={user ? '' : 'border-white/40 bg-transparent text-white hover:bg-white/10'}
              asChild
            >
              <Link to="/clubs">{ro.landing.ctaBrowse}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-muted/30 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
            Tot ce ai nevoie ca să joci padel
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <h3 className="mb-2 font-semibold text-brand-950">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
