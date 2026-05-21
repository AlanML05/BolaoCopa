import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/AppShell";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AdminRankingDashboard } from "./pages/AdminRankingDashboard";
import { GroupStandingsPage } from "./pages/GroupStandingsPage";
import { LoginPage } from "./pages/LoginPage";
import { MyBetsPage } from "./pages/MyBetsPage";
import { SignUpPage } from "./pages/SignUpPage";

function RootRedirect() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={currentUser.is_admin ? "/admin/ranking" : "/my-bets"} replace />;
}

function GuestOnlyRoute({ children }) {
  const { currentUser } = useAuth();
  if (currentUser) {
    return <Navigate to={currentUser.is_admin ? "/admin/ranking" : "/my-bets"} replace />;
  }
  return children;
}

function ProtectedLayout() {
  const { currentUser, logout } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell sessionUser={currentUser} onLogout={logout}>
      <Outlet />
    </AppShell>
  );
}

function AppRoutes() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/login"
        element={
          <GuestOnlyRoute>
            <LoginPage />
          </GuestOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <GuestOnlyRoute>
            <SignUpPage />
          </GuestOnlyRoute>
        }
      />
      <Route element={<ProtectedLayout />}>
        <Route
          path="/my-bets"
          element={
            currentUser?.is_admin ? (
              <Navigate to="/admin/ranking" replace />
            ) : (
              <MyBetsPage sessionUser={currentUser} />
            )
          }
        />
        <Route
          path="/admin/ranking"
          element={
            currentUser?.is_admin ? (
              <AdminRankingDashboard sessionUser={currentUser} />
            ) : (
              <Navigate to="/my-bets" replace />
            )
          }
        />
        <Route path="/standings" element={<GroupStandingsPage sessionUser={currentUser} />} />
      </Route>
      <Route
        path="*"
        element={
          <Navigate
            to={currentUser ? (currentUser.is_admin ? "/admin/ranking" : "/my-bets") : "/login"}
            replace
          />
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <footer className="pointer-events-none fixed bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/55 px-4 py-1.5 text-center text-[0.68rem] font-medium tracking-[0.08em] text-slate-300/80 shadow-lg shadow-black/30 backdrop-blur-md">
          © Direitos Autorais de Alan Martins Leandro
        </footer>
      </AuthProvider>
    </BrowserRouter>
  );
}
