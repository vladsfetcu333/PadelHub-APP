import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function Layout() {
  const { pathname } = useLocation();

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/health', label: 'Health' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg text-brand-950">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-950 text-white text-sm font-bold">
              P
            </span>
            Padel Platform
          </Link>

          <nav className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname === link.to
                    ? 'bg-brand-50 text-brand-950'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>Padel Platform &copy; {new Date().getFullYear()} &mdash; University Thesis Project</p>
      </footer>
    </div>
  );
}
