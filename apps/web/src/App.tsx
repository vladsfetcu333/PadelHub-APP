import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Landing from '@/pages/Landing';
import HealthPage from '@/pages/HealthPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ClubsListPage from '@/pages/clubs/ClubsListPage';
import ClubDetailPage from '@/pages/clubs/ClubDetailPage';
import NewClubPage from '@/pages/clubs/NewClubPage';
import ProfilePage from '@/pages/profile/ProfilePage';
import PublicProfilePage from '@/pages/profile/PublicProfilePage';
import { RequireAuth, RequireRole } from '@/components/RouteGuards';
import { Toaster } from '@/components/ui/sonner';
import { useAuth } from '@/store/auth';

export default function App() {
  const hydrate = useAuth((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/health" element={<HealthPage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/clubs" element={<ClubsListPage />} />
          <Route
            path="/clubs/new"
            element={
              <RequireRole roles={['ADMIN', 'CLUB_OWNER']}>
                <NewClubPage />
              </RequireRole>
            }
          />
          <Route path="/clubs/:slug" element={<ClubDetailPage />} />

          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route path="/profile/:username" element={<PublicProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
