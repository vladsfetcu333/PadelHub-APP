import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { ro } from '@padel/shared';
import { LogOut, User as UserIcon, Heart, Menu } from 'lucide-react';
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
    { to: '/', label: ro.nav.home },
    { to: '/clubs', label: ro.nav.clubs },
    { to: '/open-matches', label: ro.nav.openMatches },
    { to: '/matching', label: ro.nav.matching, auth: true },
    { to: '/matches', label: ro.nav.matches, auth: true },
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
      <header className="sticky top-0 z-10 border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
          {/* Mobile hamburger — visible below sm */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-md p-2 hover:bg-muted sm:hidden" aria-label="Menu">
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {visibleLinks.map((link) => (
                <DropdownMenuItem
                  key={link.to}
                  onClick={() => navigate(link.to)}
                  className={cn(isActive(link.to) && 'bg-brand-50 font-medium text-brand-950')}
                >
                  {link.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            to="/"
            className="flex min-w-0 items-center gap-2 text-lg font-semibold text-brand-950"
          >
            <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-950 text-sm font-bold text-white">
              P
            </span>
            <span className="hidden truncate sm:inline">{ro.app.name}</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {visibleLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive(link.to)
                    ? 'bg-brand-50 text-brand-950'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            {status === 'authenticated' && user && <NotificationBell />}
            {status === 'authenticated' && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 rounded-full p-1 hover:bg-muted"
                    aria-label={ro.nav.profile}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-brand-950 text-sm font-semibold text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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
                <Button asChild size="sm">
                  <Link to="/register">{ro.nav.register}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>{ro.app.footer}</p>
      </footer>

      {/* Floating chatbot — renders nothing for guests */}
      <ChatWidget />
    </div>
  );
}
