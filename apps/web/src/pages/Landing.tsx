import { Link } from 'react-router-dom';
import {
  Sparkles,
  MapPin,
  TrendingUp,
  ArrowRight,
  Trophy,
  MessageSquareText,
  CheckCircle2,
  Users,
  Calendar,
  Shield,
} from 'lucide-react';
import { ro } from '@padel/shared';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/store/auth';

export default function Landing() {
  const user = useAuth((s) => s.user);

  return (
    <div className="flex flex-col">
      {/* ───── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        {/* Decorative mesh gradient background */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-hero-mesh opacity-90"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-grid-fade bg-grid"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-6xl px-4 pb-20 pt-20 sm:pt-28 lg:pb-28 lg:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            {/* Eyebrow chip */}
            <div className="mb-6 inline-flex animate-fade-in items-center gap-2 rounded-full border border-brand-200/70 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-800 shadow-soft backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
              </span>
              Prima platformă de padel din România
            </div>

            {/* Headline */}
            <h1 className="animate-fade-up font-display text-5xl font-extrabold leading-[1.05] tracking-extra-tight text-ink-950 sm:text-6xl lg:text-7xl">
              Găsește-ți <span className="text-gradient animate-gradient-pan">partenerii</span>{' '}
              perfecți de padel.
            </h1>

            {/* Subtitle */}
            <p className="mx-auto mt-6 max-w-2xl animate-fade-up-slow text-lg leading-relaxed text-ink-600 sm:text-xl">
              Algoritm inteligent de compatibilitate, rating Glicko-2 pentru dublu, turnee Americano
              și Mexicano, asistent conversațional în limba română. Tot ce ai nevoie într-o singură
              platformă.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex animate-fade-up flex-col items-center justify-center gap-3 sm:flex-row">
              {!user ? (
                <>
                  <Button size="xl" variant="gradient" asChild>
                    <Link to="/register">
                      Începe gratuit <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="xl" variant="outline" asChild>
                    <Link to="/clubs">Vezi cluburile</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button size="xl" variant="gradient" asChild>
                    <Link to="/matching">
                      Caută parteneri <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="xl" variant="outline" asChild>
                    <Link to="/clubs">Vezi cluburile</Link>
                  </Button>
                </>
              )}
            </div>

            {/* Trust line */}
            <div className="mt-10 flex animate-fade-up flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-500">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-brand-600" /> Cont gratuit
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-brand-600" /> Fără card de credit
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-brand-600" /> 100% în limba română
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ───── STATS STRIP ────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-ink-950 text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-4">
          {[
            { value: '67+', label: 'Jucători activi' },
            { value: '18', label: 'Cluburi parteneri' },
            { value: '400+', label: 'Meciuri jucate' },
            { value: '8', label: 'Turnee organizate' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                <span className="text-gradient">{s.value}</span>
              </div>
              <div className="mt-1 text-sm font-medium text-ink-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ───── FEATURES ───────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-background to-brand-50/30 px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="eyebrow mb-3">Funcționalități cheie</p>
            <h2 className="font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
              Tot ce ai nevoie ca să joci padel
            </h2>
            <p className="mt-4 text-lg text-ink-600">
              De la primul match până la primul turneu — platforma se adaptează nivelului tău.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: 'Potrivire inteligentă',
                desc: 'Algoritm MCDA care analizează nivelul, partea preferată, disponibilitatea, distanța și istoricul comun. Vezi un scor explicabil 0–100 pentru fiecare partener.',
                color: 'from-brand-500 to-brand-700',
              },
              {
                icon: MapPin,
                title: 'Cluburi pe hartă',
                desc: '18 cluburi în 8 orașe, cu terenuri indoor/outdoor, fotografii, ore de program și filtrare pe rază de km cu formula haversine.',
                color: 'from-lime2-400 to-brand-600',
              },
              {
                icon: TrendingUp,
                title: 'Rating Glicko-2',
                desc: 'Sistem de rating dinamic adaptat pentru dublu, cu deviație și volatilitate per jucător. Evoluția ta este vizibilă pe un grafic interactiv.',
                color: 'from-brand-600 to-ink-900',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-3xl border border-border/70 bg-white p-8 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lifted"
              >
                <div
                  className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${f.color} text-white shadow-soft transition-transform group-hover:scale-110`}
                >
                  <f.icon className="h-7 w-7" strokeWidth={2.25} />
                </div>
                <h3 className="font-display text-xl font-bold tracking-tight text-ink-900">
                  {f.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="eyebrow mb-3">Trei pași</p>
            <h2 className="font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
              De la cont nou la primul match în 5 minute
            </h2>
          </div>

          <div className="relative">
            {/* Connecting line on desktop */}
            <div
              className="absolute left-1/2 top-12 hidden h-[2px] w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-brand-200 to-transparent md:block"
              aria-hidden="true"
            />

            <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
              {[
                {
                  n: '01',
                  icon: Users,
                  title: 'Înregistrează-te',
                  desc: 'Crează cont, completează profilul de padel: nivel, parte preferată, disponibilitate săptămânală și cluburile favorite.',
                },
                {
                  n: '02',
                  icon: Sparkles,
                  title: 'Primește potriviri',
                  desc: 'Vezi parteneri compatibili cu scor explicabil, accept-uri instant la match-uri deschise și recomandări pentru turnee.',
                },
                {
                  n: '03',
                  icon: Trophy,
                  title: 'Joacă & evoluează',
                  desc: 'Înregistrează scorurile, confirmă cu cei 4 participanți și urmărește-ți rating-ul pe grafic interactiv.',
                },
              ].map((step) => (
                <div key={step.n} className="relative text-center">
                  <div className="mx-auto mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full border border-brand-200 bg-white shadow-soft">
                    <step.icon className="h-10 w-10 text-brand-600" strokeWidth={2} />
                  </div>
                  <div className="absolute right-1/2 top-0 translate-x-12 -translate-y-1 font-display text-7xl font-extrabold tracking-tight text-brand-100/70">
                    {step.n}
                  </div>
                  <h3 className="font-display text-2xl font-bold tracking-tight text-ink-900">
                    {step.title}
                  </h3>
                  <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-ink-600">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───── TOURNAMENT FORMATS + CHATBOT TEASER ────────────────────────── */}
      <section className="bg-brand-50/40 px-4 py-24">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          {/* Tournaments card */}
          <div className="rounded-3xl border border-border/70 bg-white p-10 shadow-soft">
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <Trophy className="h-6 w-6" strokeWidth={2.25} />
            </div>
            <h3 className="font-display text-2xl font-bold tracking-tight text-ink-950">
              Trei formate de turnee
            </h3>
            <p className="mt-3 text-[15px] text-ink-600">
              Organizează evenimente la club sau între prieteni cu generare automată de runde.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                {
                  name: 'Americano',
                  desc: 'Rotație de parteneri round-robin, 5–8 jucători',
                },
                {
                  name: 'Mexicano',
                  desc: 'Parteneri aleși după clasament — adaptiv la surprize',
                },
                {
                  name: 'Eliminare directă',
                  desc: 'Bracket 8 / 16 / 32 cu seeding după rating Glicko',
                },
              ].map((t) => (
                <li
                  key={t.name}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-brand-50/40 p-3.5"
                >
                  <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" strokeWidth={2.25} />
                  <div>
                    <div className="font-semibold text-ink-900">{t.name}</div>
                    <div className="text-ink-600">{t.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Chatbot card */}
          <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-ink-950 via-ink-900 to-brand-900 p-10 text-white shadow-lifted">
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-brand-300 backdrop-blur">
              <MessageSquareText className="h-6 w-6" strokeWidth={2.25} />
            </div>
            <h3 className="font-display text-2xl font-bold tracking-tight">
              Asistent conversațional în română
            </h3>
            <p className="mt-3 text-[15px] text-ink-300">
              Întreabă orice despre reguli, tactici sau funcțiile platformei — răspuns ancorat în
              173 de chunk-uri de cunoștințe.
            </p>

            {/* Chat preview */}
            <div className="mt-6 space-y-3 rounded-2xl bg-black/30 p-4 backdrop-blur">
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-brand-600 px-4 py-2 text-sm">
                  Care e diferența între Americano și Mexicano?
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white/10 px-4 py-2 text-sm text-ink-100 backdrop-blur">
                  În Americano partenerii se rotesc după o schemă fixă, în timp ce Mexicano alege
                  echipele după clasamentul curent…
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs text-ink-400">
              <Shield className="h-3.5 w-3.5" />
              Generat de Claude Haiku 4.5 cu pgvector + Xenova embeddings
            </div>
          </div>
        </div>
      </section>

      {/* ───── FINAL CTA ──────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-ink-950 px-4 py-24">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-hero-mesh opacity-50"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Gata să-ți găsești <span className="text-gradient">echipa</span>?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-300">
            Înregistrare gratuită. Fără card. Cinci minute până la prima recomandare.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {!user ? (
              <>
                <Button size="xl" variant="gradient" asChild>
                  <Link to="/register">
                    Crează cont gratuit <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  asChild
                >
                  <Link to="/login">Am deja cont</Link>
                </Button>
              </>
            ) : (
              <Button size="xl" variant="gradient" asChild>
                <Link to="/matching">
                  Caută parteneri acum <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
          {/* Hidden but kept for layout-shift parity */}
          <div className="sr-only">{ro.app.tagline}</div>
        </div>
      </section>
    </div>
  );
}
