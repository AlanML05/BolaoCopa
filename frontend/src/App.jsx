import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/AppShell";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AdminRankingDashboard } from "./pages/AdminRankingDashboard";
import { LoginPage } from "./pages/LoginPage";
import { MyBetsPage } from "./pages/MyBetsPage";

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
      </AuthProvider>
    </BrowserRouter>
  );
}
