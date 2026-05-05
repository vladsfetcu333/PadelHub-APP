import { Navigate, useLocation } from 'react-router-dom';
import type { UserRole } from '@padel/shared';
import { useAuth } from '@/store/auth';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useAuth((s) => s.status);
  const location = useLocation();

  if (status === 'idle' || status === 'hydrating') {
    return <CenteredSpinner />;
  }
  if (status === 'guest') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { status, user } = useAuth();
  if (status === 'idle' || status === 'hydrating') return <CenteredSpinner />;
  if (status === 'guest' || !user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function CenteredSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
    </div>
  );
}
