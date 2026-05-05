import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Landing() {
  const features = [
    { title: 'Find Partners', description: 'AI-powered matching to find players at your level.' },
    {
      title: 'Discover Clubs',
      description: 'Browse padel clubs across Romania with real-time availability.',
    },
    {
      title: 'Play Tournaments',
      description: 'Join Americano & Mexicano format tournaments near you.',
    },
    {
      title: 'Track Rating',
      description: 'Dynamic Glicko-2 rating system that reflects your true skill.',
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-950 to-brand-700 text-white py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block text-brand-200 text-sm font-medium tracking-widest uppercase mb-4">
            Coming Soon
          </span>
          <h1 className="text-5xl font-bold leading-tight mb-6">Padel Platform</h1>
          <p className="text-xl text-brand-100 mb-10 max-w-xl mx-auto">
            Romania&apos;s first dedicated platform for finding padel partners, booking courts, and
            competing in organised tournaments.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/health">Check API Status</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            Everything you need to play padel
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-brand-950 mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
