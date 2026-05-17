import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { ro } from '@padel/shared';
import { LogOut, User as UserIcon, Heart, Menu, Sparkles, Github, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/NotificationBell';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { Button } from '@/components/ui/button';

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, status, logout } = useAuth();

  const navLinks: Array<{ to: string; label: string; auth?: boolean }> = [
    { to: '/clubs', label: ro.nav.clubs },
    { to: '/open-matches', label: ro.nav.openMatches },
    { to: '/matching', label: ro.nav.matching, auth: true },
    { to: '/matches', label: ro.nav.matches, auth: true },
    { to: '/tournaments', label: ro.nav.tournaments },
  ];

  const visibleLinks = navLinks.filter((link) => !link.auth || status === 'authenticated');

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + '/');

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() || 'U'
    : '';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ───── HEADER ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
          {/* Mobile hamburger */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="rounded-lg p-2 text-ink-700 transition hover:bg-muted sm:hidden"
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {visibleLinks.map((link) => (
                <DropdownMenuItem
                  key={link.to}
                  onClick={() => navigate(link.to)}
                  className={cn(isActive(link.to) && 'bg-brand-50 font-semibold text-brand-800')}
                >
                  {link.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Logo */}
          <Link
            to="/"
            className="group flex min-w-0 items-center gap-2.5 font-display text-lg font-bold tracking-tight text-ink-950"
          >
            <span className="relative inline-flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-tr from-brand-700 via-brand-500 to-lime2-400 shadow-soft transition-transform group-hover:scale-105">
              <span className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/20" />
              <span className="relative text-base font-extrabold text-white">P</span>
            </span>
            <span className="hidden truncate sm:inline">Padel Platform</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 sm:flex">
            {visibleLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  isActive(link.to) ? 'text-brand-800' : 'text-ink-600 hover:text-ink-900',
                )}
              >
                {link.label}
                {isActive(link.to) && (
                  <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-brand-500 to-lime2-400" />
                )}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {status === 'authenticated' && user && <NotificationBell />}
            {status === 'authenticated' && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 rounded-full p-0.5 ring-2 ring-transparent transition hover:ring-brand-200"
                    aria-label={ro.nav.profile}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-gradient-to-tr from-brand-700 to-brand-500 text-sm font-bold text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="font-semibold">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      @{user.username}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <UserIcon className="mr-2 h-4 w-4" /> {ro.nav.profile}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile?tab=availability')}>
                    <Heart className="mr-2 h-4 w-4" /> {ro.profile.tabAvailability}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/reports/player')}>
                    <Sparkles className="mr-2 h-4 w-4" /> {ro.nav.reports}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> {ro.nav.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/login">{ro.nav.login}</Link>
                </Button>
                <Button asChild variant="gradient" size="sm">
                  <Link to="/register">{ro.nav.register}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ───── MAIN ────────────────────────────────────────────────────── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ───── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-border bg-ink-950 text-ink-300">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 font-display text-lg font-bold text-white">
                <span className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-tr from-brand-700 via-brand-500 to-lime2-400 shadow-soft">
                  <span className="text-base font-extrabold text-white">P</span>
                </span>
                Padel Platform
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ink-400">
                Prima platformă din România dedicată jucătorilor de padel. Găsește parteneri,
                descoperă cluburi, joacă turnee.
              </p>
            </div>

            {/* Explore */}
            <div>
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                Explorează
              </div>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/clubs" className="transition hover:text-white">
                    {ro.nav.clubs}
                  </Link>
                </li>
                <li>
                  <Link to="/open-matches" className="transition hover:text-white">
                    {ro.nav.openMatches}
                  </Link>
                </li>
                <li>
                  <Link to="/tournaments" className="transition hover:text-white">
                    {ro.nav.tournaments}
                  </Link>
                </li>
                <li>
                  <Link to="/matching" className="transition hover:text-white">
                    {ro.nav.matching}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Cont */}
            <div>
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                Cont
              </div>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/register" className="transition hover:text-white">
                    {ro.nav.register}
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="transition hover:text-white">
                    {ro.nav.login}
                  </Link>
                </li>
                <li>
                  <Link to="/profile" className="transition hover:text-white">
                    {ro.nav.profile}
                  </Link>
                </li>
                <li>
                  <Link to="/notifications" className="transition hover:text-white">
                    {ro.nav.notifications}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Proiect */}
            <div>
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                Proiect
              </div>
              <ul className="space-y-2.5 text-sm">
                <li className="text-ink-400">Lucrare de licență 2025–2026</li>
                <li className="text-ink-400">Sfetcu Vlad-Andrei</li>
                <li>
                  <a
                    href="mailto:vladissimo123@gmail.com"
                    className="inline-flex items-center gap-1.5 transition hover:text-white"
                  >
                    <Mail className="h-3.5 w-3.5" /> Contact
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 transition hover:text-white"
                  >
                    <Github className="h-3.5 w-3.5" /> GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-ink-800 pt-6 text-xs text-ink-500 sm:flex-row sm:items-center">
            <p>© 2026 Padel Platform. Toate drepturile rezervate.</p>
            <p className="font-medium text-ink-400">
              Construit cu React, Express, PostgreSQL + pgvector și Claude.
            </p>
          </div>
        </div>
      </footer>

      {/* Floating chatbot — renders nothing for guests */}
      <ChatWidget />
    </div>
  );
}
