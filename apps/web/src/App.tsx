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
import MatchingPage from '@/pages/matching/MatchingPage';
import OpenMatchesListPage from '@/pages/openMatches/OpenMatchesListPage';
import OpenMatchDetailPage from '@/pages/openMatches/OpenMatchDetailPage';
import NewOpenMatchPage from '@/pages/openMatches/NewOpenMatchPage';
import MyMatchesPage from '@/pages/matches/MyMatchesPage';
import MatchDetailPage from '@/pages/matches/MatchDetailPage';
import TournamentsListPage from '@/pages/tournaments/TournamentsListPage';
import TournamentDetailPage from '@/pages/tournaments/TournamentDetailPage';
import NewTournamentPage from '@/pages/tournaments/NewTournamentPage';
import ManageTournamentPage from '@/pages/tournaments/ManageTournamentPage';
import TournamentDisplayPage from '@/pages/tournaments/TournamentDisplayPage';
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
        {/* TV display mode — full screen, no Layout */}
        <Route path="/tournaments/:id/display" element={<TournamentDisplayPage />} />

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

          <Route
            path="/matching"
            element={
              <RequireAuth>
                <MatchingPage />
              </RequireAuth>
            }
          />

          <Route path="/open-matches" element={<OpenMatchesListPage />} />
          <Route
            path="/open-matches/new"
            element={
              <RequireAuth>
                <NewOpenMatchPage />
              </RequireAuth>
            }
          />
          <Route path="/open-matches/:id" element={<OpenMatchDetailPage />} />

          <Route
            path="/matches"
            element={
              <RequireAuth>
                <MyMatchesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/matches/:id"
            element={
              <RequireAuth>
                <MatchDetailPage />
              </RequireAuth>
            }
          />

          <Route path="/tournaments" element={<TournamentsListPage />} />
          <Route
            path="/tournaments/new"
            element={
              <RequireAuth>
                <NewTournamentPage />
              </RequireAuth>
            }
          />
          <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
          <Route
            path="/tournaments/:id/manage"
            element={
              <RequireAuth>
                <ManageTournamentPage />
              </RequireAuth>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
